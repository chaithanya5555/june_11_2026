from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import csv
import io
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
stripe_api_key = os.environ.get('STRIPE_API_KEY', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'snapalign2026')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_DEMO_MODE')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'DEMO_SECRET_REPLACE_ME')
PAYMENT_FEE_PERCENT = 2.0

# Manual UPI Payment Settings (default values)
UPI_ID = os.environ.get('UPI_ID', 'paytmqr5ga0is@ptys')
UPI_QR_URL = os.environ.get('UPI_QR_URL', 'https://customer-assets.emergentagent.com/job_align-snap-test/artifacts/hnj7teu3_paytm%20qr.pdf')
UPI_NAME = os.environ.get('UPI_NAME', 'M UMARANI')

import razorpay
import hashlib
import hmac

def get_razorpay_client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def is_demo_mode():
    return RAZORPAY_KEY_ID.startswith('rzp_test_DEMO')

# ── Password Helpers ──
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── Health Check ──
@api_router.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    try:
        # Quick DB ping
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": "disconnected", "error": str(e)}


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
    variants: Optional[List[dict]] = None
    warranty: Optional[str] = None  # e.g., "1 Year", "6 Months", None = no warranty
    images: Optional[List[str]] = None  # Additional gallery images (main `image` is always shown first)
    video: Optional[str] = None  # Product video URL (mp4 or YouTube embed)

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
    variants: Optional[List[dict]] = None
    warranty: Optional[str] = None
    images: Optional[List[str]] = None
    video: Optional[str] = None

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1
    variant_id: Optional[str] = None

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class CheckoutRequest(BaseModel):
    origin_url: str
    payment_method: str = "razorpay"
    coupon_code: Optional[str] = None

class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str

class SettingsUpdateRequest(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    admin_password: Optional[str] = None
    whatsapp_number: Optional[str] = None
    upi_id: Optional[str] = None
    upi_qr_url: Optional[str] = None
    upi_name: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None

class AdminLoginRequest(BaseModel):
    email: Optional[str] = None
    password: str

class TrackRequest(BaseModel):
    order_id: str

class ManualPaymentRequest(BaseModel):
    utr: str
    order_id: str

class UTRVerifyRequest(BaseModel):
    order_id: str
    action: str  # "approve" or "reject"

class CouponCreate(BaseModel):
    code: str
    type: str = "percentage"
    value: float
    min_order_amount: float = 0
    max_uses: int = 0
    expires_at: Optional[str] = None
    active: bool = True

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None
    active: Optional[bool] = None

class CouponValidateRequest(BaseModel):
    code: str
    cart_total: float

class AdminUserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "warehouse_manager"

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
    return {"role": session.get("role", "owner"), "name": session.get("name", "Admin"), "email": session.get("email", "")}

async def require_owner(request: Request) -> dict:
    admin = await require_admin(request)
    if admin["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return admin

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

# ── Admin Auth (RBAC) ──
@api_router.post("/admin/login")
async def admin_login(req: AdminLoginRequest, response: Response):
    if req.email:
        admin_user = await db.admin_users.find_one({"email": req.email.lower().strip()}, {"_id": 0})
        if admin_user and verify_password(req.password, admin_user["password_hash"]):
            token = f"admin_{uuid.uuid4().hex}"
            await db.admin_sessions.insert_one({
                "token": token,
                "admin_user_id": admin_user["admin_user_id"],
                "role": admin_user["role"],
                "name": admin_user["name"],
                "email": admin_user["email"],
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            response.set_cookie(key="admin_token", value=token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
            return {"message": "Logged in", "token": token, "role": admin_user["role"], "name": admin_user["name"]}
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Legacy password-only login (backward compat)
    if req.password == ADMIN_PASSWORD:
        token = f"admin_{uuid.uuid4().hex}"
        await db.admin_sessions.insert_one({
            "token": token, "role": "owner", "name": "Owner",
            "email": "owner@snapalign.com",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        response.set_cookie(key="admin_token", value=token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
        return {"message": "Logged in", "token": token, "role": "owner", "name": "Owner"}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/admin/verify")
async def admin_verify(request: Request):
    admin = await require_admin(request)
    return {"authenticated": True, "role": admin["role"], "name": admin["name"]}

@api_router.post("/admin/logout")
async def admin_logout(request: Request, response: Response):
    at = request.cookies.get("admin_token")
    if at:
        await db.admin_sessions.delete_many({"token": at})
    response.delete_cookie(key="admin_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ── Product Routes ──
@api_router.get("/products")
async def get_products(
    category: Optional[str] = None, 
    subcategory: Optional[str] = None,
    brand: Optional[str] = None,
    device_model: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None, 
    featured: Optional[bool] = None
):
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if brand:
        query["brand"] = brand
    if device_model:
        query["device_model"] = {"$regex": device_model, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}}, 
            {"description": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"device_model": {"$regex": search, "$options": "i"}},
            {"seo_keywords": {"$regex": search, "$options": "i"}}
        ]
    if featured is not None:
        query["featured"] = featured
    
    sort_field = [("created_at", -1)]
    if sort == "price_asc": sort_field = [("price", 1)]
    elif sort == "price_desc": sort_field = [("price", -1)]
    elif sort == "name": sort_field = [("name", 1)]
    elif sort == "rating": sort_field = [("rating", -1)]
    
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

@api_router.get("/brands")
async def get_brands():
    """Get all unique brands"""
    return sorted(await db.products.distinct("brand"))

@api_router.get("/subcategories")
async def get_subcategories(category: Optional[str] = None):
    """Get subcategories, optionally filtered by category"""
    query = {"category": category} if category else {}
    return sorted(await db.products.distinct("subcategory", query))

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
    query = {"user_id": user["user_id"], "product_id": item.product_id}
    if item.variant_id:
        query["variant_id"] = item.variant_id
    existing = await db.cart_items.find_one(query, {"_id": 0})
    if existing:
        await db.cart_items.update_one(query, {"$set": {"quantity": existing["quantity"] + item.quantity}})
    else:
        doc = {"cart_item_id": f"ci_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "product_id": item.product_id, "quantity": item.quantity, "added_at": datetime.now(timezone.utc).isoformat()}
        if item.variant_id:
            doc["variant_id"] = item.variant_id
        await db.cart_items.insert_one(doc)
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

# ── Coupon Routes ──
@api_router.get("/admin/coupons")
async def admin_get_coupons(request: Request):
    await require_admin(request)
    return await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/admin/coupons", status_code=201)
async def admin_create_coupon(coupon: CouponCreate, request: Request):
    await require_owner(request)
    existing = await db.coupons.find_one({"code": coupon.code.upper().strip()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    doc = coupon.model_dump()
    doc["code"] = doc["code"].upper().strip()
    doc["coupon_id"] = f"cpn_{uuid.uuid4().hex[:12]}"
    doc["used_count"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.coupons.insert_one(doc)
    return await db.coupons.find_one({"coupon_id": doc["coupon_id"]}, {"_id": 0})

@api_router.put("/admin/coupons/{coupon_id}")
async def admin_update_coupon(coupon_id: str, update: CouponUpdate, request: Request):
    await require_owner(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper().strip()
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.coupons.update_one({"coupon_id": coupon_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return await db.coupons.find_one({"coupon_id": coupon_id}, {"_id": 0})

@api_router.delete("/admin/coupons/{coupon_id}")
async def admin_delete_coupon(coupon_id: str, request: Request):
    await require_owner(request)
    result = await db.coupons.delete_one({"coupon_id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted"}

@api_router.post("/coupons/validate")
async def validate_coupon(req: CouponValidateRequest, request: Request):
    await get_current_user(request)
    coupon = await db.coupons.find_one({"code": req.code.upper().strip(), "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    if coupon.get("expires_at"):
        exp = datetime.fromisoformat(coupon["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Coupon has expired")
    if coupon.get("max_uses", 0) > 0 and coupon.get("used_count", 0) >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    if req.cart_total < coupon.get("min_order_amount", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order amount is ₹{coupon['min_order_amount']}")
    if coupon["type"] == "percentage":
        discount = round(req.cart_total * coupon["value"] / 100, 2)
    else:
        discount = min(coupon["value"], req.cart_total)
    return {
        "valid": True,
        "code": coupon["code"],
        "type": coupon["type"],
        "value": coupon["value"],
        "discount": discount,
        "message": f"Coupon applied! You save ₹{discount:.0f}"
    }

# ── Checkout / Razorpay Payment ──

async def _apply_coupon(coupon_code: str, subtotal: float) -> dict:
    if not coupon_code:
        return {"discount": 0, "coupon_code": None}
    coupon = await db.coupons.find_one({"code": coupon_code.upper().strip(), "active": True}, {"_id": 0})
    if not coupon:
        return {"discount": 0, "coupon_code": None}
    if coupon.get("expires_at"):
        exp = datetime.fromisoformat(coupon["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return {"discount": 0, "coupon_code": None}
    if coupon.get("max_uses", 0) > 0 and coupon.get("used_count", 0) >= coupon["max_uses"]:
        return {"discount": 0, "coupon_code": None}
    if subtotal < coupon.get("min_order_amount", 0):
        return {"discount": 0, "coupon_code": None}
    if coupon["type"] == "percentage":
        discount = round(subtotal * coupon["value"] / 100, 2)
    else:
        discount = min(coupon["value"], subtotal)
    await db.coupons.update_one({"coupon_id": coupon["coupon_id"]}, {"$inc": {"used_count": 1}})
    return {"discount": discount, "coupon_code": coupon["code"], "coupon_id": coupon["coupon_id"]}

async def _post_payment_success(order_id: str, payment_id: str, method: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order or order.get("status") == "confirmed":
        return
    await db.orders.update_one({"order_id": order_id}, {"$set": {
        "status": "confirmed", "paid_at": datetime.now(timezone.utc).isoformat(),
        "payment_id": payment_id, "payment_method": method
    }})
    for item in order.get("items", []):
        await db.products.update_one(
            {"product_id": item["product_id"], "stock": {"$gte": item["quantity"]}},
            {"$inc": {"stock": -item["quantity"]}}
        )
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
    user_id = order.get("user_id")
    if user_id:
        await db.cart_items.delete_many({"user_id": user_id})
    logger.info(f"Post-payment: Order {order_id} confirmed, stock deducted, settlement Rs{settlement}")

@api_router.get("/payment/config")
async def payment_config():
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
            price = product["price"]
            if ci.get("variant_id") and product.get("variants"):
                variant = next((v for v in product["variants"] if v.get("variant_id") == ci["variant_id"]), None)
                if variant:
                    price = price + variant.get("price_modifier", 0)
            item_total = price * ci["quantity"]
            total += item_total
            item_data = {"product_id": product["product_id"], "name": product["name"], "price": price, "quantity": ci["quantity"], "image": product.get("image", "")}
            if ci.get("variant_id"):
                item_data["variant_id"] = ci["variant_id"]
            order_items.append(item_data)
    shipping = 0 if total >= 500 else 49
    coupon_result = await _apply_coupon(req.coupon_code, total)
    discount = coupon_result["discount"]
    grand_total = round(total + shipping - discount, 2)
    if grand_total < 0:
        grand_total = 0
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    order_doc = {
        "order_id": order_id, "user_id": user["user_id"], "items": order_items,
        "subtotal": round(total, 2), "shipping": shipping, "discount": discount,
        "total": grand_total, "status": "pending_payment", "tracking_number": "",
        "payment_method": req.payment_method,
        "customer_name": user.get("name", ""), "customer_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if coupon_result["coupon_code"]:
        order_doc["coupon_code"] = coupon_result["coupon_code"]
    await db.orders.insert_one(order_doc)
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
            "customer_name": user.get("name", ""), "customer_email": user.get("email", ""),
            "discount": discount
        }
    try:
        rz_client = get_razorpay_client()
        rz_order = rz_client.order.create({
            "amount": int(grand_total * 100),
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
            "customer_name": user.get("name", ""), "customer_email": user.get("email", ""),
            "discount": discount
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")

@api_router.post("/payment/verify")
async def verify_razorpay_payment(req: RazorpayVerifyRequest, request: Request):
    await get_current_user(request)
    txn = await db.payment_transactions.find_one({"razorpay_order_id": req.razorpay_order_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.get("demo_mode"):
        await db.payment_transactions.update_one(
            {"razorpay_order_id": req.razorpay_order_id},
            {"$set": {"payment_status": "paid", "razorpay_payment_id": req.razorpay_payment_id}}
        )
        await _post_payment_success(req.order_id, req.razorpay_payment_id, txn.get("payment_method", "demo"))
        return {"status": "success", "message": "Payment verified (demo mode)", "order_id": req.order_id}
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
    await get_current_user(request)
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

# ── Manual UPI Payment System ──
@api_router.get("/payment/upi-config")
async def get_upi_config():
    """Get UPI payment configuration for manual payment"""
    settings = await db.admin_settings.find_one({"setting_id": "global"}, {"_id": 0})
    return {
        "upi_id": settings.get("upi_id", UPI_ID) if settings else UPI_ID,
        "upi_qr_url": settings.get("upi_qr_url", UPI_QR_URL) if settings else UPI_QR_URL,
        "upi_name": settings.get("upi_name", UPI_NAME) if settings else UPI_NAME,
        "whatsapp_number": settings.get("whatsapp_number", "") if settings else "",
    }

@api_router.post("/payment/manual-upi/create-order")
async def create_manual_upi_order(req: CheckoutRequest, request: Request):
    """Create order for manual UPI payment (no gateway, just QR code)"""
    user = await get_current_user(request)
    cart_items = await db.cart_items.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    total = 0.0
    order_items = []
    for ci in cart_items:
        product = await db.products.find_one({"product_id": ci["product_id"]}, {"_id": 0})
        if product:
            price = product["price"]
            if ci.get("variant_id") and product.get("variants"):
                variant = next((v for v in product["variants"] if v.get("variant_id") == ci["variant_id"]), None)
                if variant:
                    price = price + variant.get("price_modifier", 0)
            item_total = price * ci["quantity"]
            total += item_total
            item_data = {"product_id": product["product_id"], "name": product["name"], "price": price, "quantity": ci["quantity"], "image": product.get("image", "")}
            if ci.get("variant_id"):
                item_data["variant_id"] = ci["variant_id"]
            order_items.append(item_data)
    
    shipping = 0 if total >= 500 else 49
    coupon_result = await _apply_coupon(req.coupon_code, total)
    discount = coupon_result["discount"]
    grand_total = round(total + shipping - discount, 2)
    if grand_total < 0:
        grand_total = 0
    
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    order_doc = {
        "order_id": order_id, 
        "user_id": user["user_id"], 
        "items": order_items,
        "subtotal": round(total, 2), 
        "shipping": shipping, 
        "discount": discount,
        "total": grand_total, 
        "status": "awaiting_utr",  # New status for manual payment
        "tracking_number": "",
        "payment_method": "manual_upi",
        "customer_name": user.get("name", ""), 
        "customer_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if coupon_result["coupon_code"]:
        order_doc["coupon_code"] = coupon_result["coupon_code"]
    await db.orders.insert_one(order_doc)
    
    # Get UPI config
    settings = await db.admin_settings.find_one({"setting_id": "global"}, {"_id": 0})
    
    return {
        "order_id": order_id,
        "amount": grand_total,
        "upi_id": settings.get("upi_id", UPI_ID) if settings else UPI_ID,
        "upi_qr_url": settings.get("upi_qr_url", UPI_QR_URL) if settings else UPI_QR_URL,
        "upi_name": settings.get("upi_name", UPI_NAME) if settings else UPI_NAME,
    }

@api_router.post("/payment/manual-upi/submit-utr")
async def submit_utr(req: ManualPaymentRequest, request: Request):
    """Customer submits UTR after making UPI payment"""
    user = await get_current_user(request)
    
    # Validate UTR format (typically 12 digits)
    if not req.utr or len(req.utr) < 6:
        raise HTTPException(status_code=400, detail="Invalid UTR number")
    
    # Find the order
    order = await db.orders.find_one({"order_id": req.order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] not in ["awaiting_utr", "pending_payment"]:
        raise HTTPException(status_code=400, detail="Order is not awaiting payment")
    
    # Update order with UTR
    await db.orders.update_one(
        {"order_id": req.order_id},
        {"$set": {
            "status": "payment_verification",
            "utr": req.utr,
            "utr_submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_manual_{uuid.uuid4().hex[:12]}",
        "order_id": req.order_id,
        "user_id": user["user_id"],
        "amount": order["total"],
        "utr": req.utr,
        "payment_method": "manual_upi",
        "payment_status": "pending_verification",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "status": "success",
        "message": "Payment under verification. Order will be confirmed within 1 hour.",
        "order_id": req.order_id
    }

@api_router.get("/admin/pending-utr")
async def get_pending_utr_orders(request: Request):
    """Admin: Get all orders pending UTR verification"""
    await require_admin(request)
    orders = await db.orders.find(
        {"status": "payment_verification"},
        {"_id": 0}
    ).sort("utr_submitted_at", -1).to_list(100)
    return orders

@api_router.post("/admin/verify-utr")
async def verify_utr(req: UTRVerifyRequest, request: Request):
    """Admin: Approve or reject UTR payment"""
    await require_admin(request)
    
    order = await db.orders.find_one({"order_id": req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != "payment_verification":
        raise HTTPException(status_code=400, detail="Order is not pending verification")
    
    if req.action == "approve":
        # Approve payment - process order
        payment_id = f"pay_MANUAL_{uuid.uuid4().hex[:12]}"
        await db.orders.update_one(
            {"order_id": req.order_id},
            {"$set": {
                "status": "confirmed",
                "payment_verified_at": datetime.now(timezone.utc).isoformat(),
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.payment_transactions.update_one(
            {"order_id": req.order_id, "payment_method": "manual_upi"},
            {"$set": {"payment_status": "paid", "payment_id": payment_id}}
        )
        
        # Deduct stock
        for item in order.get("items", []):
            await db.products.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": -item["quantity"]}}
            )
        
        # Clear cart for user
        await db.cart_items.delete_many({"user_id": order["user_id"]})
        
        return {"status": "success", "message": "Payment verified and order confirmed", "order_id": req.order_id}
    
    elif req.action == "reject":
        await db.orders.update_one(
            {"order_id": req.order_id},
            {"$set": {
                "status": "payment_rejected",
                "payment_rejected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.payment_transactions.update_one(
            {"order_id": req.order_id, "payment_method": "manual_upi"},
            {"$set": {"payment_status": "rejected"}}
        )
        return {"status": "success", "message": "Payment rejected", "order_id": req.order_id}
    
    raise HTTPException(status_code=400, detail="Invalid action")

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
    total_fees = round(total_revenue * PAYMENT_FEE_PERCENT / 100, 2)
    projected_revenue = round(total_revenue - total_fees, 2)
    settlements = await db.settlements.find({}, {"_id": 0}).to_list(10000)
    actual_settled = sum(s.get("net_settlement", 0) for s in settlements)
    low_stock = [p for p in all_products if 5 <= p.get("stock", 0) <= 20]
    critical_stock = [p for p in all_products if p.get("stock", 0) < 5]
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    total_coupons = await db.coupons.count_documents({"active": True})
    return {
        "total_products": total_products, "total_orders": total_orders, "total_users": total_users,
        "total_revenue": round(total_revenue, 2), "net_profit": round(net_profit, 2),
        "total_fees": total_fees, "projected_revenue": projected_revenue,
        "actual_settled": round(actual_settled, 2),
        "low_stock": low_stock, "critical_stock": critical_stock, "recent_orders": recent_orders,
        "total_coupons": total_coupons
    }

@api_router.get("/admin/analytics")
async def admin_analytics(request: Request):
    await require_admin(request)
    now = datetime.now(timezone.utc)
    all_orders = await db.orders.find({"status": {"$in": ["confirmed", "shipped", "delivered"]}}, {"_id": 0}).to_list(10000)
    daily_revenue = defaultdict(float)
    daily_orders = defaultdict(int)
    category_revenue = defaultdict(float)
    status_counts = defaultdict(int)
    product_sales = defaultdict(lambda: {"name": "", "quantity": 0, "revenue": 0})
    for o in all_orders:
        created = o.get("created_at", "")
        if created:
            day = created[:10]
            daily_revenue[day] += o.get("total", 0)
            daily_orders[day] += 1
        for item in o.get("items", []):
            cat = "Unknown"
            prod = await db.products.find_one({"product_id": item.get("product_id")}, {"_id": 0, "category": 1})
            if prod:
                cat = prod.get("category", "Unknown")
            category_revenue[cat] += item.get("price", 0) * item.get("quantity", 1)
            pid = item.get("product_id", "")
            product_sales[pid]["name"] = item.get("name", "")
            product_sales[pid]["quantity"] += item.get("quantity", 0)
            product_sales[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
    all_orders_all = await db.orders.find({}, {"_id": 0, "status": 1}).to_list(10000)
    for o in all_orders_all:
        status_counts[o.get("status", "unknown")] += 1
    days = []
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        days.append({"date": d, "revenue": round(daily_revenue.get(d, 0), 2), "orders": daily_orders.get(d, 0)})
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    return {
        "daily": days,
        "category_revenue": [{"category": k, "revenue": round(v, 2)} for k, v in category_revenue.items()],
        "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
        "top_products": top_products
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
    if doc.get("variants"):
        for v in doc["variants"]:
            if not v.get("variant_id"):
                v["variant_id"] = f"var_{uuid.uuid4().hex[:8]}"
    await db.products.insert_one(doc)
    return await db.products.find_one({"product_id": doc["product_id"]}, {"_id": 0})

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, update: ProductUpdate, request: Request):
    await require_admin(request)
    # Use exclude_unset so explicit `null` from client IS saved (needed to clear warranty/video);
    # fields not sent at all are not touched.
    update_data = update.model_dump(exclude_unset=True)
    if "variants" in update_data and update_data["variants"]:
        for v in update_data["variants"]:
            if not v.get("variant_id"):
                v["variant_id"] = f"var_{uuid.uuid4().hex[:8]}"
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
    writer.writerow(["Order ID", "Customer Name", "Customer Email", "Items", "Total (INR)", "Discount", "Coupon", "Status", "Tracking Number", "Payment Method", "Date"])
    for o in orders:
        user = await db.users.find_one({"user_id": o.get("user_id")}, {"_id": 0})
        items_str = "; ".join([f"{i['name']} x{i['quantity']}" for i in o.get("items", [])])
        writer.writerow([
            o.get("order_id", ""), user.get("name", "") if user else o.get("customer_name", ""),
            user.get("email", "") if user else o.get("customer_email", ""), items_str,
            o.get("total", 0), o.get("discount", 0), o.get("coupon_code", ""),
            o.get("status", ""), o.get("tracking_number", ""),
            o.get("payment_method", ""), o.get("created_at", "")
        ])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_{datetime.now().strftime('%Y%m%d')}.csv"})

# ── Admin User Management (RBAC) ──
@api_router.get("/admin/users")
async def admin_get_users(request: Request):
    await require_owner(request)
    users = await db.admin_users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return users

@api_router.post("/admin/users", status_code=201)
async def admin_create_user(user_data: AdminUserCreate, request: Request):
    await require_owner(request)
    existing = await db.admin_users.find_one({"email": user_data.email.lower().strip()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    if user_data.role not in ["owner", "warehouse_manager"]:
        raise HTTPException(status_code=400, detail="Role must be 'owner' or 'warehouse_manager'")
    doc = {
        "admin_user_id": f"adm_{uuid.uuid4().hex[:12]}",
        "email": user_data.email.lower().strip(),
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_users.insert_one(doc)
    return {"admin_user_id": doc["admin_user_id"], "email": doc["email"], "name": doc["name"], "role": doc["role"]}

@api_router.delete("/admin/users/{admin_user_id}")
async def admin_delete_user(admin_user_id: str, request: Request):
    await require_owner(request)
    result = await db.admin_users.delete_one({"admin_user_id": admin_user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin user not found")
    return {"message": "Admin user deleted"}

# ── Admin Settings (Key Management + WhatsApp + UPI) ──
@api_router.get("/admin/settings")
async def admin_get_settings(request: Request):
    await require_admin(request)
    extra = await db.admin_settings.find_one({"setting_id": "global"}, {"_id": 0})
    return {
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "razorpay_key_secret_masked": RAZORPAY_KEY_SECRET[:8] + "..." if len(RAZORPAY_KEY_SECRET) > 8 else "***",
        "demo_mode": is_demo_mode(),
        "payment_fee_percent": PAYMENT_FEE_PERCENT,
        "whatsapp_number": extra.get("whatsapp_number", "") if extra else "",
        "upi_id": extra.get("upi_id", UPI_ID) if extra else UPI_ID,
        "upi_qr_url": extra.get("upi_qr_url", UPI_QR_URL) if extra else UPI_QR_URL,
        "upi_name": extra.get("upi_name", UPI_NAME) if extra else UPI_NAME,
    }

@api_router.put("/admin/settings")
async def admin_update_settings(req: SettingsUpdateRequest, request: Request):
    await require_owner(request)
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
    
    # Update database settings (WhatsApp + UPI)
    db_updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if req.whatsapp_number is not None:
        db_updates["whatsapp_number"] = req.whatsapp_number
        updated.append("whatsapp_number")
    if req.upi_id is not None:
        db_updates["upi_id"] = req.upi_id
        updated.append("upi_id")
    if req.upi_qr_url is not None:
        db_updates["upi_qr_url"] = req.upi_qr_url
        updated.append("upi_qr_url")
    if req.upi_name is not None:
        db_updates["upi_name"] = req.upi_name
        updated.append("upi_name")
    
    if len(db_updates) > 1:  # More than just updated_at
        await db.admin_settings.update_one(
            {"setting_id": "global"},
            {"$set": db_updates},
            upsert=True
        )
    
    return {"message": f"Updated: {', '.join(updated)}", "demo_mode": is_demo_mode()}

@api_router.get("/admin/whatsapp-config")
async def get_whatsapp_config():
    extra = await db.admin_settings.find_one({"setting_id": "global"}, {"_id": 0})
    number = extra.get("whatsapp_number", "") if extra else ""
    return {"whatsapp_number": number, "enabled": bool(number)}

# ── Seed Data ──
@api_router.post("/seed")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing > 0:
        # Idempotent: never wipe admin customizations once seeded.
        # Use /api/admin/reseed (owner-only) to force a reset if ever needed.
        return {"message": "already seeded", "count": existing}
    products = [
        {"product_id": "prod_tg001", "name": "Diamond Shield 9H Tempered Glass", "description": "Premium 9H hardness tempered glass with oleophobic coating. Anti-fingerprint, bubble-free installation. Edge-to-edge protection.", "price": 499.0, "cost_price": 120.0, "compare_at_price": 999.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600", "stock": 200, "featured": True, "bin_location": "Shelf A, Bin 1", "avg_rating": 4.5, "review_count": 45, "variants": [{"variant_id": "var_tg001_clr", "type": "Finish", "value": "Clear", "price_modifier": 0, "stock": 100}, {"variant_id": "var_tg001_mat", "type": "Finish", "value": "Matte", "price_modifier": 50, "stock": 100}]},
        {"product_id": "prod_tg002", "name": "Privacy Guard Anti-Spy Glass", "description": "Anti-spy tempered glass visible only from front. 28-degree privacy filter. Full edge coverage with alignment frame.", "price": 699.0, "cost_price": 180.0, "compare_at_price": 1299.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?w=600", "stock": 80, "featured": True, "bin_location": "Shelf A, Bin 2", "avg_rating": 4.2, "review_count": 22},
        {"product_id": "prod_tg003", "name": "Matte Finish Gaming Glass", "description": "Anti-glare matte tempered glass for gamers. Smooth touch, reduced fingerprints. Compatible with all popular models.", "price": 549.0, "cost_price": 140.0, "compare_at_price": 999.0, "category": "Tempered Glass", "image": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600", "stock": 150, "featured": False, "bin_location": "Shelf A, Bin 3", "avg_rating": 4.3, "review_count": 18},
        {"product_id": "prod_cs001", "name": "Tough Armor Hybrid Case", "description": "Military-grade dual-layer protection with carbon fiber texture. Raised bezels for camera and screen. Air cushion corners.", "price": 799.0, "cost_price": 200.0, "compare_at_price": 1499.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1618393649915-df0a256fdd30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxpcGhvbmUlMjBjYXNlJTIwZGFya3xlbnwwfHx8fDE3NzQ4MjM1NTl8MA&ixlib=rb-4.1.0&q=85", "stock": 120, "featured": True, "bin_location": "Shelf B, Bin 1", "avg_rating": 4.7, "review_count": 67, "variants": [{"variant_id": "var_cs001_blk", "type": "Color", "value": "Black", "price_modifier": 0, "stock": 60}, {"variant_id": "var_cs001_nav", "type": "Color", "value": "Navy Blue", "price_modifier": 0, "stock": 30}, {"variant_id": "var_cs001_red", "type": "Color", "value": "Crimson Red", "price_modifier": 100, "stock": 30}]},
        {"product_id": "prod_cs002", "name": "Ultra Thin Matte Case", "description": "0.3mm ultra-slim design with anti-fingerprint matte coating. Precision cutouts. Featherweight protection.", "price": 499.0, "cost_price": 100.0, "compare_at_price": 899.0, "category": "Cases", "image": "https://images.pexels.com/photos/18423755/pexels-photo-18423755.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 180, "featured": True, "bin_location": "Shelf B, Bin 2", "avg_rating": 4.4, "review_count": 38, "variants": [{"variant_id": "var_cs002_blk", "type": "Color", "value": "Midnight Black", "price_modifier": 0, "stock": 90}, {"variant_id": "var_cs002_gry", "type": "Color", "value": "Gunmetal Grey", "price_modifier": 0, "stock": 90}]},
        {"product_id": "prod_cs003", "name": "Crystal Clear Pro Case", "description": "Anti-yellowing transparent case with reinforced corners. Shows original phone design. UV-resistant material.", "price": 599.0, "cost_price": 130.0, "compare_at_price": 1099.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600", "stock": 95, "featured": False, "bin_location": "Shelf B, Bin 3", "avg_rating": 4.3, "review_count": 29},
        {"product_id": "prod_cs004", "name": "Leather Executive Wallet Case", "description": "Premium PU leather with card slots and kickstand. Magnetic closure. Business-class protection.", "price": 1299.0, "cost_price": 350.0, "compare_at_price": 2499.0, "category": "Cases", "image": "https://images.unsplash.com/photo-1601593346740-925612772716?w=600", "stock": 3, "featured": True, "bin_location": "Shelf B, Bin 4", "avg_rating": 4.6, "review_count": 15, "variants": [{"variant_id": "var_cs004_brn", "type": "Color", "value": "Brown", "price_modifier": 0, "stock": 2}, {"variant_id": "var_cs004_blk", "type": "Color", "value": "Black", "price_modifier": 0, "stock": 1}]},
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
        # Inject defaults for new fields (warranty, images gallery, video)
        # Admin can customize these per-product later via the admin dashboard
        p["warranty"] = {
            "Tempered Glass": "6 Months",
            "Cases": None,
            "Holders": None,
            "Cables & Chargers": "1 Year",
        }.get(p["category"])
        # Gallery = main image + 3 generic accessory shots (admin can replace)
        p["images"] = [
            p["image"],
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80",
            "https://images.unsplash.com/photo-1520923642038-b4259acecbd7?w=800&q=80",
        ]
        # Generic product demo video served from our own backend
        # (admin can replace with any mp4 URL per-product later)
        p["video"] = "/api/static/video/product-demo.mp4"
    await db.products.insert_many(products)
    return {"message": f"Seeded {len(products)} products"}

# ── Startup: Seed Admin Users ──
@app.on_event("startup")
async def seed_admin_users():
    existing = await db.admin_users.count_documents({})
    if existing == 0:
        owner = {
            "admin_user_id": "adm_owner_001",
            "email": "owner@snapalign.com",
            "name": "Owner Admin",
            "password_hash": hash_password("snapalign2026"),
            "role": "owner",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        wh_manager = {
            "admin_user_id": "adm_wh_001",
            "email": "warehouse@snapalign.com",
            "name": "Warehouse Manager",
            "password_hash": hash_password("warehouse2026"),
            "role": "warehouse_manager",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_users.insert_many([owner, wh_manager])
        logger.info("Seeded default admin users: owner@snapalign.com / warehouse@snapalign.com")
    # Seed sample coupons if none exist
    coupon_count = await db.coupons.count_documents({})
    if coupon_count == 0:
        sample_coupons = [
            {"coupon_id": "cpn_welcome10", "code": "WELCOME10", "type": "percentage", "value": 10, "min_order_amount": 500, "max_uses": 100, "used_count": 0, "active": True, "expires_at": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(), "created_at": datetime.now(timezone.utc).isoformat()},
            {"coupon_id": "cpn_flat100", "code": "FLAT100", "type": "fixed", "value": 100, "min_order_amount": 999, "max_uses": 50, "used_count": 0, "active": True, "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(), "created_at": datetime.now(timezone.utc).isoformat()},
            {"coupon_id": "cpn_snap20", "code": "SNAP20", "type": "percentage", "value": 20, "min_order_amount": 1500, "max_uses": 0, "used_count": 0, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.coupons.insert_many(sample_coupons)
        logger.info("Seeded 3 sample coupons")

# ── Include Router & Middleware ──
app.include_router(api_router)

# Serve static assets (product demo video etc.) at /api/static/*
# Using /api prefix so Kubernetes ingress routes to the backend.
STATIC_DIR = ROOT_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/api/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

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
