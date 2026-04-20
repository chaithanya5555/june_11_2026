"""
SnapAlign — Variant System Backend Tests (Iteration 4)
Covers:
  - Admin product CRUD with variant_axes + variants(options dict)
  - Public GET /api/products/{id} returns variant_axes + variants
  - Cart variant-awareness (auth required → expect 401 for negative tests)
  - Manual UPI create-order variant price_modifier inclusion (auth required)
  - Pre-seeded products prod_927e589bb547 & prod_ffd936f15deb sanity
"""
import os
import requests
import pytest

def _load_frontend_url():
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    return ln.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_url() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
ADMIN_PWD = "snapalign2026"


# ── Shared admin session fixture ──
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PWD})
    assert r.status_code == 200, f"Legacy admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    s.cookies.set("admin_token", data["token"])
    return s


# ── Pre-seeded product sanity ──
class TestSeededVariantProducts:
    def test_tempered_glass_cascade_seeded(self):
        r = requests.get(f"{BASE_URL}/api/products/prod_927e589bb547")
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["product_id"] == "prod_927e589bb547"
        # variant_axes
        assert isinstance(p.get("variant_axes"), list) and len(p["variant_axes"]) == 2
        keys = [a["key"] for a in p["variant_axes"]]
        assert keys == ["brand", "model"]
        model_axis = next(a for a in p["variant_axes"] if a["key"] == "model")
        assert model_axis.get("depends_on") == "brand"
        # variants — 4 with options dict
        variants = p.get("variants") or []
        assert len(variants) == 4
        for v in variants:
            assert "variant_id" in v
            assert "options" in v and isinstance(v["options"], dict)
            assert "brand" in v["options"] and "model" in v["options"]
        # samsung S24 Ultra has +50 modifier
        s24 = next(v for v in variants if v["options"]["model"] == "S24 Ultra")
        assert s24["price_modifier"] == 50

    def test_silicon_case_colors_seeded(self):
        r = requests.get(f"{BASE_URL}/api/products/prod_ffd936f15deb")
        assert r.status_code == 200, r.text
        p = r.json()
        axes = p.get("variant_axes") or []
        assert len(axes) == 1 and axes[0]["key"] == "color" and axes[0]["ui"] == "swatch"
        variants = p.get("variants") or []
        assert len(variants) == 3
        # Each color variant has its own image + swatch_hex
        for v in variants:
            assert v.get("image"), f"Variant {v['variant_id']} missing image"
            assert v.get("swatch_hex"), f"Variant {v['variant_id']} missing swatch_hex"
        red = next(v for v in variants if v["options"]["color"] == "Crimson Red")
        assert red["price_modifier"] == 100


# ── Admin POST/PUT for new variant_axes schema ──
class TestAdminVariantCRUD:
    created_id = None

    def test_create_product_with_variant_axes(self, admin_session):
        payload = {
            "name": "TEST_Variant_Product",
            "description": "Backend test product with variant_axes",
            "price": 299.0,
            "category": "Tempered Glass",
            "image": "https://picsum.photos/seed/test/600",
            "stock": 20,
            "variant_axes": [
                {"key": "brand", "label": "Brand", "ui": "dropdown"},
                {"key": "model", "label": "Model", "ui": "dropdown", "depends_on": "brand"},
            ],
            "variants": [
                {"options": {"brand": "iPhone", "model": "15"}, "stock": 5, "price_modifier": 0},
                {"options": {"brand": "Samsung", "model": "S24"}, "stock": 5, "price_modifier": 25},
            ],
        }
        r = admin_session.post(f"{BASE_URL}/api/admin/products", json=payload)
        assert r.status_code == 201, f"Create failed: {r.text}"
        prod = r.json()
        assert prod["name"] == "TEST_Variant_Product"
        assert len(prod["variant_axes"]) == 2
        assert len(prod["variants"]) == 2
        # variant_id auto-generated
        for v in prod["variants"]:
            assert v.get("variant_id", "").startswith("var_")
        TestAdminVariantCRUD.created_id = prod["product_id"]

    def test_get_created_product_persisted(self, admin_session):
        pid = TestAdminVariantCRUD.created_id
        assert pid, "previous create failed"
        r = requests.get(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 200
        p = r.json()
        assert p["name"] == "TEST_Variant_Product"
        assert len(p["variants"]) == 2
        assert p["variants"][0]["options"]["brand"] in ("iPhone", "Samsung")

    def test_update_variant_axes_and_variants(self, admin_session):
        pid = TestAdminVariantCRUD.created_id
        update = {
            "variant_axes": [
                {"key": "color", "label": "Color", "ui": "swatch"},
            ],
            "variants": [
                {"options": {"color": "Red"}, "stock": 3, "price_modifier": 50,
                 "image": "https://picsum.photos/seed/r/600", "swatch_hex": "#ff0000"},
                {"options": {"color": "Blue"}, "stock": 2, "price_modifier": 0,
                 "image": "https://picsum.photos/seed/b/600", "swatch_hex": "#0000ff"},
            ],
        }
        r = admin_session.put(f"{BASE_URL}/api/admin/products/{pid}", json=update)
        assert r.status_code == 200, r.text
        p = r.json()
        assert len(p["variant_axes"]) == 1 and p["variant_axes"][0]["key"] == "color"
        assert len(p["variants"]) == 2
        # GET to confirm persistence
        r2 = requests.get(f"{BASE_URL}/api/products/{pid}")
        p2 = r2.json()
        assert len(p2["variant_axes"]) == 1
        assert any(v["options"].get("color") == "Red" for v in p2["variants"])

    def test_cleanup_delete(self, admin_session):
        pid = TestAdminVariantCRUD.created_id
        if not pid:
            pytest.skip("nothing to delete")
        r = admin_session.delete(f"{BASE_URL}/api/admin/products/{pid}")
        assert r.status_code in (200, 204)
        # confirm gone
        r2 = requests.get(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 404


# ── Legacy variants still readable (regression) ──
class TestLegacyVariantsRegression:
    def test_legacy_tg001_intact(self):
        r = requests.get(f"{BASE_URL}/api/products/prod_tg001")
        assert r.status_code == 200
        p = r.json()
        assert p.get("variants"), "legacy variants missing"
        # legacy uses flat type/value, NO variant_axes
        v = p["variants"][0]
        assert "type" in v and "value" in v
        # variant_axes either missing or empty (legacy)
        assert not p.get("variant_axes")

    def test_legacy_cs001_intact(self):
        r = requests.get(f"{BASE_URL}/api/products/prod_cs001")
        assert r.status_code == 200
        p = r.json()
        assert p.get("variants"), "legacy variants missing"
        types = [v.get("type") for v in p["variants"]]
        assert "Color" in types


# ── Cart endpoints — auth required (401 negative path proves wiring) ──
class TestCartVariantAuth:
    def test_get_cart_unauth_401(self):
        r = requests.get(f"{BASE_URL}/api/cart")
        assert r.status_code == 401

    def test_post_cart_unauth_401(self):
        r = requests.post(f"{BASE_URL}/api/cart", json={
            "product_id": "prod_927e589bb547",
            "quantity": 1,
            "variant_id": "v_s24u",
        })
        assert r.status_code == 401

    def test_put_cart_item_unauth_401(self):
        r = requests.put(f"{BASE_URL}/api/cart/item/ci_dummy", json={
            "product_id": "prod_927e589bb547",
            "quantity": 2,
            "variant_id": "v_s24u",
        })
        assert r.status_code == 401

    def test_delete_cart_item_unauth_401(self):
        r = requests.delete(f"{BASE_URL}/api/cart/item/ci_dummy")
        assert r.status_code == 401

    def test_manual_upi_create_order_unauth_401(self):
        r = requests.post(f"{BASE_URL}/api/payment/manual-upi/create-order", json={
            "origin_url": "https://login-preview-10.preview.emergentagent.com",
            "payment_method": "manual_upi",
        })
        assert r.status_code == 401


# ── Cart end-to-end with synthetic user session (variant-awareness) ──
class TestCartVariantE2E:
    """Insert a synthetic user + session_token directly into Mongo, then exercise variant cart flow."""

    @pytest.fixture(scope="class")
    def user_ctx(self):
        # Create user via mongo using a small helper through the admin API is not possible; use motor through subprocess
        import subprocess, json, uuid
        token = f"tk_{uuid.uuid4().hex}"
        user_id = f"u_{uuid.uuid4().hex[:10]}"
        from datetime import datetime, timezone, timedelta
        expires = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        script = f"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
async def go():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    await db.users.insert_one({{
        "user_id": "{user_id}", "email": "test_variant_user@snapalign.com",
        "name": "Variant Test", "picture": "", "created_at": "2026-01-01T00:00:00+00:00"
    }})
    await db.user_sessions.insert_one({{
        "session_token": "{token}", "user_id": "{user_id}",
        "expires_at": "{expires}", "created_at": "2026-01-01T00:00:00+00:00"
    }})
    # cleanup any prior cart
    await db.cart_items.delete_many({{"user_id": "{user_id}"}})
asyncio.run(go())
"""
        env = os.environ.copy()
        # load backend env
        with open("/app/backend/.env") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.strip().partition("=")
                    env[k] = v.strip('"').strip("'")
        res = subprocess.run(["python3", "-c", script], capture_output=True, text=True, env=env)
        assert res.returncode == 0, f"seed failed: {res.stderr}"
        sess = requests.Session()
        sess.cookies.set("session_token", token)
        yield {"user_id": user_id, "token": token, "session": sess}
        # teardown
        cleanup = f"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
async def go():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    await db.users.delete_one({{"user_id": "{user_id}"}})
    await db.user_sessions.delete_one({{"session_token": "{token}"}})
    await db.cart_items.delete_many({{"user_id": "{user_id}"}})
    await db.orders.delete_many({{"user_id": "{user_id}"}})
asyncio.run(go())
"""
        subprocess.run(["python3", "-c", cleanup], env=env, capture_output=True)

    def test_add_two_variants_creates_two_lines(self, user_ctx):
        s = user_ctx["session"]
        # Add S24 Ultra (+50)
        r1 = s.post(f"{BASE_URL}/api/cart", json={
            "product_id": "prod_927e589bb547", "variant_id": "v_s24u", "quantity": 1
        })
        assert r1.status_code == 200, r1.text
        # Add iPhone 15 (+0) — different variant of same product
        r2 = s.post(f"{BASE_URL}/api/cart", json={
            "product_id": "prod_927e589bb547", "variant_id": "v_ip15", "quantity": 2
        })
        assert r2.status_code == 200, r2.text
        # GET cart — should have 2 separate lines, each with variant enriched
        rg = s.get(f"{BASE_URL}/api/cart")
        assert rg.status_code == 200
        items = rg.json()
        assert len(items) == 2, f"expected 2 lines, got {len(items)}"
        for it in items:
            assert it.get("variant") is not None, "cart item missing enriched variant"
            assert "options" in it["variant"]
            assert it.get("product", {}).get("product_id") == "prod_927e589bb547"
        # Save a cart_item_id for next tests
        s24_line = next(it for it in items if it["variant_id"] == "v_s24u")
        TestCartVariantE2E._s24_ci = s24_line["cart_item_id"]

    def test_update_quantity_by_cart_item_id(self, user_ctx):
        s = user_ctx["session"]
        ci = TestCartVariantE2E._s24_ci
        r = s.put(f"{BASE_URL}/api/cart/item/{ci}", json={
            "product_id": "prod_927e589bb547", "variant_id": "v_s24u", "quantity": 3
        })
        assert r.status_code == 200, r.text
        items = s.get(f"{BASE_URL}/api/cart").json()
        s24_line = next(it for it in items if it["cart_item_id"] == ci)
        assert s24_line["quantity"] == 3

    def test_manual_upi_includes_variant_modifier(self, user_ctx):
        s = user_ctx["session"]
        # Cart now: S24 Ultra qty3 (price 499+50=549), iPhone15 qty2 (price 499)
        # subtotal = 549*3 + 499*2 = 1647 + 998 = 2645, shipping 0 (>=500), no coupon
        r = s.post(f"{BASE_URL}/api/payment/manual-upi/create-order", json={
            "origin_url": BASE_URL, "payment_method": "manual_upi"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "order_id" in data
        assert data["amount"] == 2645.0, f"expected 2645, got {data['amount']}"

    def test_delete_cart_item_by_id(self, user_ctx):
        s = user_ctx["session"]
        ci = TestCartVariantE2E._s24_ci
        r = s.delete(f"{BASE_URL}/api/cart/item/{ci}")
        assert r.status_code == 200
        items = s.get(f"{BASE_URL}/api/cart").json()
        assert all(it["cart_item_id"] != ci for it in items)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
