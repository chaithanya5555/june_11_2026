from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

stripe_api_key = os.environ.get('STRIPE_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── Pydantic Models ──

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str = ""
    role: str = "customer"
    created_at: str = ""

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image: str
    stock: int = 100
    featured: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image: Optional[str] = None
    stock: Optional[int] = None
    featured: Optional[bool] = None

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class CheckoutRequest(BaseModel):
    origin_url: str

class OrderStatusUpdate(BaseModel):
    status: str

# ── Auth Helpers ──

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ── Auth Routes ──

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = resp.json()
    email = data["email"]
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data.get("session_token", str(uuid.uuid4()))
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_count = await db.users.count_documents({})
        role = "admin" if user_count == 0 else "customer"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name,
            "picture": picture, "role": role,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*60*60
    )
    return user

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ── Product Routes ──

@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None,
                       sort: Optional[str] = None, min_price: Optional[float] = None,
                       max_price: Optional[float] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if featured is not None:
        query["featured"] = featured
    sort_field = [("created_at", -1)]
    if sort == "price_asc":
        sort_field = [("price", 1)]
    elif sort == "price_desc":
        sort_field = [("price", -1)]
    elif sort == "name":
        sort_field = [("name", 1)]
    elif sort == "rating":
        sort_field = [("avg_rating", -1)]
    products = await db.products.find(query, {"_id": 0}).sort(sort_field).to_list(100)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    product["reviews"] = reviews
    return product

@api_router.get("/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    return categories

# ── Review Routes ──

@api_router.post("/products/{product_id}/reviews")
async def add_review(product_id: str, review: ReviewCreate, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    review_doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "product_id": product_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", "Anonymous"),
        "user_picture": user.get("picture", ""),
        "rating": min(max(review.rating, 1), 5),
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    all_reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"avg_rating": round(avg, 1), "review_count": len(all_reviews)}}
    )
    return {"review_id": review_doc["review_id"], "message": "Review added"}

# ── Cart Routes ──

@api_router.get("/cart")
async def get_cart(request: Request):
    user = await get_current_user(request)
    items = await db.cart_items.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    cart_with_products = []
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            cart_with_products.append({**item, "product": product})
    return cart_with_products

@api_router.post("/cart")
async def add_to_cart(item: CartItemAdd, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = await db.cart_items.find_one(
        {"user_id": user["user_id"], "product_id": item.product_id}, {"_id": 0}
    )
    if existing:
        new_qty = existing["quantity"] + item.quantity
        await db.cart_items.update_one(
            {"user_id": user["user_id"], "product_id": item.product_id},
            {"$set": {"quantity": new_qty}}
        )
    else:
        await db.cart_items.insert_one({
            "cart_item_id": f"ci_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "product_id": item.product_id,
            "quantity": item.quantity,
            "added_at": datetime.now(timezone.utc).isoformat()
        })
    return {"message": "Added to cart"}

@api_router.put("/cart/{product_id}")
async def update_cart_item(product_id: str, item: CartItemAdd, request: Request):
    user = await get_current_user(request)
    if item.quantity <= 0:
        await db.cart_items.delete_one({"user_id": user["user_id"], "product_id": product_id})
        return {"message": "Item removed"}
    await db.cart_items.update_one(
        {"user_id": user["user_id"], "product_id": product_id},
        {"$set": {"quantity": item.quantity}}
    )
    return {"message": "Cart updated"}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, request: Request):
    user = await get_current_user(request)
    await db.cart_items.delete_one({"user_id": user["user_id"], "product_id": product_id})
    return {"message": "Removed from cart"}

@api_router.delete("/cart")
async def clear_cart(request: Request):
    user = await get_current_user(request)
    await db.cart_items.delete_many({"user_id": user["user_id"]})
    return {"message": "Cart cleared"}

# ── Wishlist Routes ──

@api_router.get("/wishlist")
async def get_wishlist(request: Request):
    user = await get_current_user(request)
    items = await db.wishlists.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    products = []
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            products.append(product)
    return products

@api_router.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.wishlists.find_one(
        {"user_id": user["user_id"], "product_id": product_id}, {"_id": 0}
    )
    if existing:
        await db.wishlists.delete_one({"user_id": user["user_id"], "product_id": product_id})
        return {"action": "removed", "message": "Removed from wishlist"}
    await db.wishlists.insert_one({
        "wishlist_id": f"wl_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "product_id": product_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    return {"action": "added", "message": "Added to wishlist"}

# ── Checkout / Payment Routes ──

@api_router.post("/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    user = await get_current_user(request)
    cart_items = await db.cart_items.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    total = 0.0
    order_items = []
    for ci in cart_items:
        product = await db.products.find_one({"product_id": ci["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * ci["quantity"]
            total += item_total
            order_items.append({
                "product_id": product["product_id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": ci["quantity"],
                "image": product.get("image", "")
            })
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    await db.orders.insert_one({
        "order_id": order_id,
        "user_id": user["user_id"],
        "items": order_items,
        "total": round(total, 2),
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/shop"
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    checkout_req = CheckoutSessionRequest(
        amount=round(total, 2),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id, "user_id": user["user_id"]}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "order_id": order_id,
        "user_id": user["user_id"],
        "amount": round(total, 2),
        "currency": "usd",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"url": session.url, "session_id": session.session_id, "order_id": order_id}

@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    user = await get_current_user(request)
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn and txn.get("payment_status") != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": status.status}}
        )
        if txn.get("order_id"):
            await db.orders.update_one(
                {"order_id": txn["order_id"]},
                {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.cart_items.delete_many({"user_id": user["user_id"]})
    elif txn and status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired", "status": "expired"}}
        )
        if txn.get("order_id"):
            await db.orders.update_one(
                {"order_id": txn["order_id"]}, {"$set": {"status": "expired"}}
            )
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        if event.payment_status == "paid" and event.session_id:
            txn = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
            if txn and txn.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                if txn.get("order_id"):
                    await db.orders.update_one(
                        {"order_id": txn["order_id"]},
                        {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat()}}
                    )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ── Order Routes ──

@api_router.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ── Admin Routes ──

@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    confirmed_orders = await db.orders.find({"status": "confirmed"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(o.get("total", 0) for o in confirmed_orders)
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_users": total_users,
        "total_revenue": round(total_revenue, 2),
        "recent_orders": recent_orders
    }

@api_router.get("/admin/orders")
async def admin_orders(request: Request):
    await require_admin(request)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for order in orders:
        user = await db.users.find_one({"user_id": order.get("user_id")}, {"_id": 0})
        order["user_email"] = user.get("email", "") if user else ""
        order["user_name"] = user.get("name", "") if user else ""
    return orders

@api_router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, update: OrderStatusUpdate, request: Request):
    await require_admin(request)
    result = await db.orders.update_one(
        {"order_id": order_id}, {"$set": {"status": update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order updated"}

@api_router.post("/admin/products", status_code=201)
async def admin_create_product(product: ProductCreate, request: Request):
    await require_admin(request)
    doc = product.model_dump()
    doc["product_id"] = f"prod_{uuid.uuid4().hex[:12]}"
    doc["avg_rating"] = 0
    doc["review_count"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(doc)
    created = await db.products.find_one({"product_id": doc["product_id"]}, {"_id": 0})
    return created

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, update: ProductUpdate, request: Request):
    await require_admin(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, request: Request):
    await require_admin(request)
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/admin/products")
async def admin_get_products(request: Request):
    await require_admin(request)
    products = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return products

# ── Seed Data ──

@api_router.post("/seed")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": f"Already have {existing} products"}
    products = [
        {"product_id": "prod_case001", "name": "Midnight Matte Case", "description": "Ultra-slim matte finish case with microfiber interior. Military-grade drop protection.", "price": 29.99, "category": "Phone Cases", "image": "https://images.unsplash.com/photo-1774102619965-5a49ce4f6329?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcGhvbmUlMjBjYXNlfGVufDB8fHx8MTc3NDgyMDUxM3ww&ixlib=rb-4.1.0&q=85", "stock": 150, "featured": True, "avg_rating": 4.5, "review_count": 12},
        {"product_id": "prod_case002", "name": "Crystal Clear Pro", "description": "Anti-yellowing transparent case with reinforced corners. Shows your phone's design.", "price": 24.99, "category": "Phone Cases", "image": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600", "stock": 200, "featured": False, "avg_rating": 4.3, "review_count": 8},
        {"product_id": "prod_case003", "name": "Leather Executive", "description": "Premium genuine leather case with card slots. Elegant and functional.", "price": 49.99, "category": "Phone Cases", "image": "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600", "stock": 80, "featured": True, "avg_rating": 4.7, "review_count": 15},
        {"product_id": "prod_sp001", "name": "Diamond Shield Protector", "description": "9H hardness tempered glass with oleophobic coating. Bubble-free installation.", "price": 14.99, "category": "Screen Protectors", "image": "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600", "stock": 300, "featured": False, "avg_rating": 4.2, "review_count": 20},
        {"product_id": "prod_sp002", "name": "Privacy Guard Film", "description": "Anti-spy screen protector visible only from front view. Full edge coverage.", "price": 19.99, "category": "Screen Protectors", "image": "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?w=600", "stock": 120, "featured": True, "avg_rating": 4.0, "review_count": 6},
        {"product_id": "prod_chg001", "name": "65W GaN Charger", "description": "Ultra-compact GaN charger with 3 ports. Charges laptop and phone simultaneously.", "price": 39.99, "category": "Chargers", "image": "https://images.pexels.com/photos/5961044/pexels-photo-5961044.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 100, "featured": True, "avg_rating": 4.8, "review_count": 25},
        {"product_id": "prod_chg002", "name": "MagSafe Wireless Pad", "description": "15W magnetic wireless charging pad with LED indicator. Perfect alignment every time.", "price": 34.99, "category": "Chargers", "image": "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=600", "stock": 90, "featured": False, "avg_rating": 4.4, "review_count": 10},
        {"product_id": "prod_cab001", "name": "Braided USB-C Cable 2m", "description": "Reinforced nylon braided cable with 100W PD support. 10,000+ bend lifespan.", "price": 12.99, "category": "Cables", "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600", "stock": 500, "featured": False, "avg_rating": 4.6, "review_count": 30},
        {"product_id": "prod_cab002", "name": "3-in-1 Charging Cable", "description": "Lightning, USB-C, and Micro-USB in one cable. Universal compatibility.", "price": 16.99, "category": "Cables", "image": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600", "stock": 250, "featured": True, "avg_rating": 4.1, "review_count": 14},
        {"product_id": "prod_ear001", "name": "AeroFit Pro Buds", "description": "Active noise cancelling with 30-hour battery. IPX5 sweat resistant.", "price": 79.99, "category": "Earphones", "image": "https://images.unsplash.com/photo-1713618651165-a3cf7f85506c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBlYXJwaG9uZXN8ZW58MHx8fHwxNzc0ODIwNTIzfDA&ixlib=rb-4.1.0&q=85", "stock": 75, "featured": True, "avg_rating": 4.6, "review_count": 18},
        {"product_id": "prod_ear002", "name": "Studio Wired Earphones", "description": "Hi-Res audio certified with inline controls. Tangle-free flat cable.", "price": 29.99, "category": "Earphones", "image": "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600", "stock": 120, "featured": False, "avg_rating": 4.3, "review_count": 9},
        {"product_id": "prod_mnt001", "name": "Magnetic Car Mount", "description": "360-degree rotation with strong N52 magnets. One-hand operation.", "price": 22.99, "category": "Mounts & Stands", "image": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600", "stock": 140, "featured": False, "avg_rating": 4.4, "review_count": 11},
        {"product_id": "prod_mnt002", "name": "Foldable Desk Stand", "description": "Adjustable aluminum desk stand. Compatible with all phones and tablets.", "price": 27.99, "category": "Mounts & Stands", "image": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600", "stock": 95, "featured": True, "avg_rating": 4.5, "review_count": 7},
        {"product_id": "prod_pb001", "name": "20000mAh Slim Power Bank", "description": "Ultra-thin 20000mAh with dual USB-C. Charges 3 devices at once.", "price": 44.99, "category": "Power Banks", "image": "https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 60, "featured": True, "avg_rating": 4.7, "review_count": 22},
        {"product_id": "prod_pb002", "name": "Solar Charger 10000mAh", "description": "Rugged solar power bank with built-in flashlight. Perfect for outdoor adventures.", "price": 34.99, "category": "Power Banks", "image": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600", "stock": 45, "featured": False, "avg_rating": 4.0, "review_count": 5},
    ]
    for p in products:
        p["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_many(products)
    return {"message": f"Seeded {len(products)} products"}

# ── Include Router & Middleware ──

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
