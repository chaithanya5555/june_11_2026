from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import csv
import io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
stripe_api_key = os.environ.get('STRIPE_API_KEY', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'snapalign2026')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_DEMO_MODE')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'DEMO_SECRET_REPLACE_ME')
PAYMENT_FEE_PERCENT = 2.0  # 2% payment gateway fee

import razorpay
import hashlib
import hmac

def get_razorpay_client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def is_demo_mode():
    return RAZORPAY_KEY_ID.startswith('rzp_test_DEMO')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── Models ──
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    cost_price: float = 0.0
    compare_at_price: Optional[float] = None
    category: str
    image: str
    stock: int = 100
    featured: bool = False
    bin_location: str = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    compare_at_price: Optional[float] = None
    category: Optional[str] = None
    image: Optional[str] = None
    stock: Optional[int] = None
    featured: Optional[bool] = None
    bin_location: Optional[str] = None

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class CheckoutRequest(BaseModel):
    origin_url: str
    payment_method: str = "razorpay"  # razorpay, upi_phonepe, upi_gpay, paytm, mobikwik

class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str

class SettingsUpdateRequest(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    admin_password: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str

class TrackRequest(BaseModel):
    order_id: str

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
    admin_token = request.cookies.get("admin_token")
    if not admin_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            admin_token = auth_header.split(" ")[1]
    if not admin_token:
        raise HTTPException(status_code=401, detail="Admin auth required")
    session = await db.admin_sessions.find_one({"token": admin_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid admin session")
    expires_at = session.get("expires_at", "")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Admin session expired")
    return {"role": "admin"}

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
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name,
            "picture": picture, "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
    return user

@api_router.get("/auth/me")
async def auth_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_many({"session_token": st})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ── Admin Auth ──
@api_router.post("/admin/login")
async def admin_login(req: AdminLoginRequest, response: Response):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    token = f"admin_{uuid.uuid4().hex}"
    await db.admin_sessions.insert_one({
        "token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(key="admin_token", value=token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
    return {"message": "Logged in", "token": token}

@api_router.get("/admin/verify")
async def admin_verify(request: Request):
    await require_admin(request)
    return {"authenticated": True}

@api_router.post("/admin/logout")
async def admin_logout(request: Request, response: Response):
    at = request.cookies.get("admin_token")
    if at:
        await db.admin_sessions.delete_many({"token": at})
    response.delete_cookie(key="admin_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ── Product Routes ──
@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None,
                       sort: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    if featured is not None:
        query["featured"] = featured
    sort_field = [("created_at", -1)]
    if sort == "price_asc": sort_field = [("price", 1)]
    elif sort == "price_desc": sort_field = [("price", -1)]
    elif sort == "name": sort_field = [("name", 1)]
    elif sort == "rating": sort_field = [("avg_rating", -1)]
    products = await db.products.find(query, {"_id": 0}).sort(sort_field).to_list(200)
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
    return await db.products.distinct("category")

# ── Reviews ──
@api_router.post("/products/{product_id}/reviews")
async def add_review(product_id: str, review: ReviewCreate, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}", "product_id": product_id,
        "user_id": user["user_id"], "user_name": user.get("name", "Anonymous"),
        "user_picture": user.get("picture", ""), "rating": min(max(review.rating, 1), 5),
        "comment": review.comment, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(doc)
    all_reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    await db.products.update_one({"product_id": product_id}, {"$set": {"avg_rating": round(avg, 1), "review_count": len(all_reviews)}})
    return {"review_id": doc["review_id"], "message": "Review added"}

# ── Cart ──
@api_router.get("/cart")
async def get_cart(request: Request):
    user = await get_current_user(request)
    items = await db.cart_items.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    result = []
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            result.append({**item, "product": product})
    return result

@api_router.post("/cart")
async def add_to_cart(item: CartItemAdd, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = await db.cart_items.find_one({"user_id": user["user_id"], "product_id": item.product_id}, {"_id": 0})
    if existing:
        await db.cart_items.update_one({"user_id": user["user_id"], "product_id": item.product_id}, {"$set": {"quantity": existing["quantity"] + item.quantity}})
    else:
        await db.cart_items.insert_one({"cart_item_id": f"ci_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "product_id": item.product_id, "quantity": item.quantity, "added_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Added to cart"}

@api_router.put("/cart/{product_id}")
async def update_cart_item(product_id: str, item: CartItemAdd, request: Request):
    user = await get_current_user(request)
    if item.quantity <= 0:
        await db.cart_items.delete_one({"user_id": user["user_id"], "product_id": product_id})
        return {"message": "Item removed"}
    await db.cart_items.update_one({"user_id": user["user_id"], "product_id": product_id}, {"$set": {"quantity": item.quantity}})
    return {"message": "Cart updated"}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, request: Request):
    user = await get_current_user(request)
    await db.cart_items.delete_one({"user_id": user["user_id"], "product_id": product_id})
    return {"message": "Removed"}

@api_router.delete("/cart")
async def clear_cart(request: Request):
    user = await get_current_user(request)
    await db.cart_items.delete_many({"user_id": user["user_id"]})
    return {"message": "Cart cleared"}

# ── Wishlist ──
@api_router.get("/wishlist")
async def get_wishlist(request: Request):
    user = await get_current_user(request)
    items = await db.wishlists.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    products = []
    for item in items:
        p = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if p: products.append(p)
    return products

@api_router.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.wishlists.find_one({"user_id": user["user_id"], "product_id": product_id}, {"_id": 0})
    if existing:
        await db.wishlists.delete_one({"user_id": user["user_id"], "product_id": product_id})
        return {"action": "removed", "message": "Removed from wishlist"}
    await db.wishlists.insert_one({"wishlist_id": f"wl_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "product_id": product_id, "added_at": datetime.now(timezone.utc).isoformat()})
    return {"action": "added", "message": "Added to wishlist"}

# ── Checkout / Razorpay Payment ──

async def _post_payment_success(order_id: str, payment_id: str, method: str):
    """Automated post-payment: update order, deduct stock, record settlement."""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order or order.get("status") == "confirmed":
        return
    # 1. Update order status to Paid/Confirmed
    await db.orders.update_one({"order_id": order_id}, {"$set": {
        "status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat(),
        "payment_id": payment_id, "payment_method": method
    }})
    # 2. Deduct warehouse stock
    for item in order.get("items", []):
        await db.products.update_one(
            {"product_id": item["product_id"], "stock": {"$gte": item["quantity"]}},
            {"$inc": {"stock": -item["quantity"]}}
        )
    # 3. Calculate settlement (total - 2% fee)
    total = order.get("total", 0)
    fee = round(total * PAYMENT_FEE_PERCENT / 100, 2)
    settlement = round(total - fee, 2)
    await db.settlements.insert_one({
        "settlement_id": f"stl_{uuid.uuid4().hex[:12]}",
        "order_id": order_id, "payment_id": payment_id,
        "gross_amount": total, "fee_percent": PAYMENT_FEE_PERCENT,
        "fee_amount": fee, "net_settlement": settlement,
        "method": method, "created_at": datetime.now(timezone.utc).isoformat()
    })
    # 4. Clear cart
    user_id = order.get("user_id")
    if user_id:
        await db.cart_items.delete_many({"user_id": user_id})
    logger.info(f"Post-payment: Order {order_id} confirmed, stock deducted, settlement ₹{settlement}")

@api_router.get("/payment/config")
async def payment_config():
    """Return Razorpay key ID for frontend (public info only)."""
    return {
        "key_id": RAZORPAY_KEY_ID,
        "demo_mode": is_demo_mode(),
        "currency": "INR",
        "methods": {
            "upi": True, "card": True, "netbanking": True,
            "wallet": True, "emi": False, "paylater": True
        }
    }

@api_router.post("/payment/create-order")
async def create_razorpay_order(req: CheckoutRequest, request: Request):
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
            order_items.append({"product_id": product["product_id"], "name": product["name"], "price": product["price"], "quantity": ci["quantity"], "image": product.get("image", "")})
    shipping = 0 if total >= 500 else 49
    grand_total = round(total + shipping, 2)
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    await db.orders.insert_one({
        "order_id": order_id, "user_id": user["user_id"], "items": order_items,
        "subtotal": round(total, 2), "shipping": shipping, "total": grand_total,
        "status": "pending_payment", "tracking_number": "", "payment_method": req.payment_method,
        "customer_name": user.get("name", ""), "customer_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Demo mode: skip Razorpay API, return simulated order
    if is_demo_mode():
        demo_rz_order_id = f"order_DEMO_{uuid.uuid4().hex[:12]}"
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "razorpay_order_id": demo_rz_order_id, "order_id": order_id,
            "user_id": user["user_id"], "amount": grand_total,
            "amount_paise": int(grand_total * 100), "currency": "INR",
            "payment_status": "created", "payment_method": req.payment_method,
            "demo_mode": True, "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {
            "order_id": order_id, "razorpay_order_id": demo_rz_order_id,
            "amount": int(grand_total * 100), "currency": "INR",
            "key_id": RAZORPAY_KEY_ID, "demo_mode": True,
            "customer_name": user.get("name", ""), "customer_email": user.get("email", "")
        }
    # Real Razorpay order
    try:
        rz_client = get_razorpay_client()
        rz_order = rz_client.order.create({
            "amount": int(grand_total * 100),  # paise
            "currency": "INR",
            "receipt": order_id[:40],
            "payment_capture": 1,
            "notes": {"order_id": order_id, "user_id": user["user_id"]}
        })
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "razorpay_order_id": rz_order["id"], "order_id": order_id,
            "user_id": user["user_id"], "amount": grand_total,
            "amount_paise": int(grand_total * 100), "currency": "INR",
            "payment_status": "created", "payment_method": req.payment_method,
            "demo_mode": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {
            "order_id": order_id, "razorpay_order_id": rz_order["id"],
            "amount": rz_order["amount"], "currency": rz_order["currency"],
            "key_id": RAZORPAY_KEY_ID, "demo_mode": False,
            "customer_name": user.get("name", ""), "customer_email": user.get("email", "")
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")

@api_router.post("/payment/verify")
async def verify_razorpay_payment(req: RazorpayVerifyRequest, request: Request):
    user = await get_current_user(request)
    txn = await db.payment_transactions.find_one({"razorpay_order_id": req.razorpay_order_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Demo mode: auto-verify
    if txn.get("demo_mode"):
        await db.payment_transactions.update_one(
            {"razorpay_order_id": req.razorpay_order_id},
            {"$set": {"payment_status": "paid", "razorpay_payment_id": req.razorpay_payment_id}}
        )
        await _post_payment_success(req.order_id, req.razorpay_payment_id, txn.get("payment_method", "demo"))
        return {"status": "success", "message": "Payment verified (demo mode)", "order_id": req.order_id}
    # Real verification
    try:
        rz_client = get_razorpay_client()
        rz_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        })
        await db.payment_transactions.update_one(
            {"razorpay_order_id": req.razorpay_order_id},
            {"$set": {"payment_status": "paid", "razorpay_payment_id": req.razorpay_payment_id, "razorpay_signature": req.razorpay_signature}}
        )
        await _post_payment_success(req.order_id, req.razorpay_payment_id, txn.get("payment_method", "razorpay"))
        return {"status": "success", "message": "Payment verified", "order_id": req.order_id}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.post("/payment/demo-complete")
async def demo_complete_payment(request: Request):
    """For demo mode: simulate successful payment."""
    user = await get_current_user(request)
    body = await request.json()
    order_id = body.get("order_id")
    razorpay_order_id = body.get("razorpay_order_id")
    if not order_id or not razorpay_order_id:
        raise HTTPException(status_code=400, detail="order_id and razorpay_order_id required")
    payment_method = body.get("payment_method", "demo")
    demo_payment_id = f"pay_DEMO_{uuid.uuid4().hex[:12]}"
    await db.payment_transactions.update_one(
        {"razorpay_order_id": razorpay_order_id},
        {"$set": {"payment_status": "paid", "razorpay_payment_id": demo_payment_id}}
    )
    await _post_payment_success(order_id, demo_payment_id, payment_method)
    return {"status": "success", "message": "Demo payment completed", "order_id": order_id, "payment_id": demo_payment_id}

# ── Orders (Customer) ──
@api_router.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    return await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ── Public Order Tracking ──
@api_router.get("/track/{order_id}")
async def track_order(order_id: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0, "user_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "order_id": order["order_id"],
        "status": order.get("status", "unknown"),
        "tracking_number": order.get("tracking_number", ""),
        "items": order.get("items", []),
        "total": order.get("total", 0),
        "created_at": order.get("created_at", ""),
        "paid_at": order.get("paid_at", ""),
    }

# ── Admin Routes ──
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    confirmed = await db.orders.find({"status": {"$in": ["confirmed", "shipped", "delivered"]}}, {"_id": 0}).to_list(10000)
    total_revenue = sum(o.get("total", 0) for o in confirmed)
    all_products = await db.products.find({}, {"_id": 0}).to_list(200)
    total_cost = 0
    for o in confirmed:
        for item in o.get("items", []):
            prod = next((p for p in all_products if p["product_id"] == item.get("product_id")), None)
            if prod:
                total_cost += prod.get("cost_price", 0) * item.get("quantity", 1)
    net_profit = total_revenue - total_cost
    # Settlement / Projected Revenue (after 2% fee)
    total_fees = round(total_revenue * PAYMENT_FEE_PERCENT / 100, 2)
    projected_revenue = round(total_revenue - total_fees, 2)
    settlements = await db.settlements.find({}, {"_id": 0}).to_list(10000)
    actual_settled = sum(s.get("net_settlement", 0) for s in settlements)
    low_stock = [p for p in all_products if 5 <= p.get("stock", 0) <= 20]
    critical_stock = [p for p in all_products if p.get("stock", 0) < 5]
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return {
        "total_products": total_products, "total_orders": total_orders, "total_users": total_users,
        "total_revenue": round(total_revenue, 2), "net_profit": round(net_profit, 2),
        "total_fees": total_fees, "projected_revenue": projected_revenue,
        "actual_settled": round(actual_settled, 2),
        "low_stock": low_stock, "critical_stock": critical_stock, "recent_orders": recent_orders
    }

@api_router.get("/admin/orders")
async def admin_orders(request: Request):
    await require_admin(request)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for order in orders:
        user = await db.users.find_one({"user_id": order.get("user_id")}, {"_id": 0})
        order["user_email"] = user.get("email", "") if user else order.get("customer_email", "")
        order["user_name"] = user.get("name", "") if user else order.get("customer_name", "")
    return orders

@api_router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, update: OrderStatusUpdate, request: Request):
    await require_admin(request)
    update_data = {}
    if update.status: update_data["status"] = update.status
    if update.tracking_number is not None: update_data["tracking_number"] = update.tracking_number
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
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
    return await db.products.find_one({"product_id": doc["product_id"]}, {"_id": 0})

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
    return await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/admin/dead-stock")
async def admin_dead_stock(request: Request):
    await require_admin(request)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_order_product_ids = set()
    recent_orders = await db.orders.find({"created_at": {"$gte": cutoff}}, {"_id": 0}).to_list(10000)
    for o in recent_orders:
        for item in o.get("items", []):
            recent_order_product_ids.add(item.get("product_id"))
    all_products = await db.products.find({}, {"_id": 0}).to_list(500)
    dead_stock = [p for p in all_products if p["product_id"] not in recent_order_product_ids]
    return dead_stock

@api_router.get("/admin/export-orders")
async def admin_export_orders(request: Request):
    await require_admin(request)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order ID", "Customer Name", "Customer Email", "Items", "Total (INR)", "Status", "Tracking Number", "Payment Method", "Date"])
    for o in orders:
        user = await db.users.find_one({"user_id": o.get("user_id")}, {"_id": 0})
        items_str = "; ".join([f"{i['name']} x{i['quantity']}" for i in o.get("items", [])])
        writer.writerow([
            o.get("order_id", ""), user.get("name", "") if user else o.get("customer_name", ""),
            user.get("email", "") if user else o.get("customer_email", ""), items_str,
            o.get("total", 0), o.get("status", ""), o.get("tracking_number", ""),
            o.get("payment_method", ""), o.get("created_at", "")
        ])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_{datetime.now().strftime('%Y%m%d')}.csv"})

# ── Admin Settings (Key Management GUI) ──
@api_router.get("/admin/settings")
async def admin_get_settings(request: Request):
    await require_admin(request)
    return {
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "razorpay_key_secret_masked": RAZORPAY_KEY_SECRET[:8] + "..." if len(RAZORPAY_KEY_SECRET) > 8 else "***",
        "demo_mode": is_demo_mode(),
        "payment_fee_percent": PAYMENT_FEE_PERCENT,
    }

@api_router.put("/admin/settings")
async def admin_update_settings(req: SettingsUpdateRequest, request: Request):
    await require_admin(request)
    global RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, ADMIN_PASSWORD
    updated = []
    env_path = ROOT_DIR / '.env'
    env_content = env_path.read_text()
    if req.razorpay_key_id:
        old_val = RAZORPAY_KEY_ID
        RAZORPAY_KEY_ID = req.razorpay_key_id
        env_content = env_content.replace(f"RAZORPAY_KEY_ID={old_val}", f"RAZORPAY_KEY_ID={req.razorpay_key_id}")
        updated.append("razorpay_key_id")
    if req.razorpay_key_secret:
        old_val = RAZORPAY_KEY_SECRET
        RAZORPAY_KEY_SECRET = req.razorpay_key_secret
        env_content = env_content.replace(f"RAZORPAY_KEY_SECRET={old_val}", f"RAZORPAY_KEY_SECRET={req.razorpay_key_secret}")
        updated.append("razorpay_key_secret")
    if req.admin_password:
        old_val = ADMIN_PASSWORD
        ADMIN_PASSWORD = req.admin_password
        env_content = env_content.replace(f"ADMIN_PASSWORD={old_val}", f"ADMIN_PASSWORD={req.admin_password}")
        updated.append("admin_password")
    env_path.write_text(env_content)
    return {"message": f"Updated: {', '.join(updated)}", "demo_mode": is_demo_mode()}

# ── Seed Data ──
@api_router.post("/seed")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing > 0:
        await db.products.delete_many({})
    products = [
        {"product_id": "prod_tg001", "name": "Diamond Shield 9H Tempered Glass", "description": "Premium 9H hardness tempered glass with oleophobic coating. Anti-fingerprint, bubble-free installation. Edge-to-edge protection.", "price": 499.0, "cost_price": 120.0, "compare_at_price": 999.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600", "stock": 200, "featured": True, "bin_location": "Shelf A, Bin 1", "avg_rating": 4.5, "review_count": 45},
        {"product_id": "prod_tg002", "name": "Privacy Guard Anti-Spy Glass", "description": "Anti-spy tempered glass visible only from front. 28-degree privacy filter. Full edge coverage with alignment frame.", "price": 699.0, "cost_price": 180.0, "compare_at_price": 1299.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?w=600", "stock": 80, "featured": True, "bin_location": "Shelf A, Bin 2", "avg_rating": 4.2, "review_count": 22},
        {"product_id": "prod_tg003", "name": "Matte Finish Gaming Glass", "description": "Anti-glare matte tempered glass for gamers. Smooth touch, reduced fingerprints. Compatible with all popular models.", "price": 549.0, "cost_price": 140.0, "compare_at_price": 999.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600", "stock": 150, "featured": False, "bin_location": "Shelf A, Bin 3", "avg_rating": 4.3, "review_count": 18},
        {"product_id": "prod_cs001", "name": "Tough Armor Hybrid Case", "description": "Military-grade dual-layer protection with carbon fiber texture. Raised bezels for camera and screen. Air cushion corners.", "price": 799.0, "cost_price": 200.0, "compare_at_price": 1499.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1618393649915-df0a256fdd30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxpcGhvbmUlMjBjYXNlJTIwZGFya3xlbnwwfHx8fDE3NzQ4MjM1NTl8MA&ixlib=rb-4.1.0&q=85", "stock": 120, "featured": True, "bin_location": "Shelf B, Bin 1", "avg_rating": 4.7, "review_count": 67},
        {"product_id": "prod_cs002", "name": "Ultra Thin Matte Case", "description": "0.3mm ultra-slim design with anti-fingerprint matte coating. Precision cutouts. Featherweight protection.", "price": 499.0, "cost_price": 100.0, "compare_at_price": 899.0, "category": "Cases", "image": "https://images.pexels.com/photos/18423755/pexels-photo-18423755.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 180, "featured": True, "bin_location": "Shelf B, Bin 2", "avg_rating": 4.4, "review_count": 38},
        {"product_id": "prod_cs003", "name": "Crystal Clear Pro Case", "description": "Anti-yellowing transparent case with reinforced corners. Shows original phone design. UV-resistant material.", "price": 599.0, "cost_price": 130.0, "compare_at_price": 1099.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600", "stock": 95, "featured": False, "bin_location": "Shelf B, Bin 3", "avg_rating": 4.3, "review_count": 29},
        {"product_id": "prod_cs004", "name": "Leather Executive Wallet Case", "description": "Premium PU leather with card slots and kickstand. Magnetic closure. Business-class protection.", "price": 1299.0, "cost_price": 350.0, "compare_at_price": 2499.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1601593346740-925612772716?w=600", "stock": 3, "featured": True, "bin_location": "Shelf B, Bin 4", "avg_rating": 4.6, "review_count": 15},
        {"product_id": "prod_hd001", "name": "Magnetic Car Mount Pro", "description": "360-degree rotation with N52 neodymium magnets. Dashboard and vent clip included. One-hand operation.", "price": 699.0, "cost_price": 180.0, "compare_at_price": 1299.0, "category": "Holders", "image": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600", "stock": 60, "featured": True, "bin_location": "Shelf C, Bin 1", "avg_rating": 4.5, "review_count": 33},
        {"product_id": "prod_hd002", "name": "Foldable Desk Stand", "description": "Aluminum alloy adjustable stand. Compatible with all phones and tablets. Anti-slip silicone pads.", "price": 599.0, "cost_price": 150.0, "compare_at_price": 999.0, "category": "Holders", "image": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600", "stock": 45, "featured": False, "bin_location": "Shelf C, Bin 2", "avg_rating": 4.4, "review_count": 19},
        {"product_id": "prod_hd003", "name": "Ring Holder Kickstand", "description": "360-degree rotating ring with magnetic car mount compatibility. Ultra-thin 3M adhesive base.", "price": 299.0, "cost_price": 60.0, "compare_at_price": 599.0, "category": "Holders", "image": "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=600", "stock": 18, "featured": False, "bin_location": "Shelf C, Bin 3", "avg_rating": 4.1, "review_count": 12},
        {"product_id": "prod_cc001", "name": "65W GaN Triple Port Charger", "description": "Ultra-compact GaN technology. 2x USB-C + 1x USB-A. Charges laptop and phone simultaneously. BIS certified.", "price": 1499.0, "cost_price": 450.0, "compare_at_price": 2999.0, "category": "Cables & Chargers", "image": "https://images.pexels.com/photos/5961044/pexels-photo-5961044.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 55, "featured": True, "bin_location": "Shelf D, Bin 1", "avg_rating": 4.8, "review_count": 52},
        {"product_id": "prod_cc002", "name": "Braided USB-C to USB-C 2m", "description": "100W PD fast charging. 10,000+ bend lifespan nylon braided cable. Gold-plated connectors.", "price": 399.0, "cost_price": 80.0, "compare_at_price": 799.0, "category": "Cables & Chargers", "image": "https://images.unsplash.com/photo-1649959223405-f927e0fc1e05?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwyfHx1c2IlMjBjaGFyZ2luZyUyMGNhYmxlJTIwZGFya3xlbnwwfHx8fDE3NzQ4MjM1NzR8MA&ixlib=rb-4.1.0&q=85", "stock": 300, "featured": False, "bin_location": "Shelf D, Bin 2", "avg_rating": 4.6, "review_count": 41},
        {"product_id": "prod_cc003", "name": "3-in-1 Charging Cable", "description": "Lightning + USB-C + Micro-USB. Universal compatibility. 1.5m length with aluminum housing.", "price": 449.0, "cost_price": 90.0, "compare_at_price": 899.0, "category": "Cables & Chargers", "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600", "stock": 170, "featured": True, "bin_location": "Shelf D, Bin 3", "avg_rating": 4.2, "review_count": 27},
        {"product_id": "prod_cc004", "name": "15W MagSafe Wireless Charger", "description": "Magnetic alignment for perfect charging. LED indicator. Compatible with all Qi-enabled devices.", "price": 999.0, "cost_price": 280.0, "compare_at_price": 1999.0, "category": "Cables & Chargers", "image": "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=600", "stock": 40, "featured": True, "bin_location": "Shelf D, Bin 4", "avg_rating": 4.5, "review_count": 23},
        {"product_id": "prod_cc005", "name": "20W Fast Charger Adapter", "description": "BIS certified 20W USB-C PD adapter. Compact folding prongs. Smart charging protection.", "price": 599.0, "cost_price": 140.0, "compare_at_price": 1199.0, "category": "Cables & Chargers", "image": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600", "stock": 4, "featured": False, "bin_location": "Shelf D, Bin 5", "avg_rating": 4.4, "review_count": 31},
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
