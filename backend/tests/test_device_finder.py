"""
SnapAlign — Device Finder Backend Tests (Iteration 5)
Covers:
  - GET /api/variant-brands aggregation across all products' variants.options
  - GET /api/products?variant_brand=X / variant_brand+variant_model filtering
  - GET /api/products?search=X matches products via variants.options.brand/model
  - Regression: legacy GET /api/products params (category/brand/subcategory/search) still work
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


# ── /api/variant-brands aggregation ──
class TestVariantBrandsEndpoint:
    @pytest.fixture(scope="class")
    def vb_payload(self):
        r = requests.get(f"{BASE_URL}/api/variant-brands")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        return data

    def test_returns_list_of_brand_objects(self, vb_payload):
        for entry in vb_payload:
            assert "brand" in entry and isinstance(entry["brand"], str)
            assert "models" in entry and isinstance(entry["models"], list)

    def test_includes_iphone_brand_with_15_and_15pro(self, vb_payload):
        iphone = next((e for e in vb_payload if e["brand"] == "iPhone"), None)
        assert iphone is not None, f"iPhone brand missing. Got: {[e['brand'] for e in vb_payload]}"
        for m in ("15", "15 Pro"):
            assert m in iphone["models"], f"Model {m} missing under iPhone (got {iphone['models']})"

    def test_includes_samsung_s24_ultra(self, vb_payload):
        samsung = next((e for e in vb_payload if e["brand"] == "Samsung"), None)
        assert samsung is not None, "Samsung brand missing"
        assert "S24 Ultra" in samsung["models"], f"got {samsung['models']}"

    def test_includes_oneplus_12(self, vb_payload):
        op = next((e for e in vb_payload if e["brand"] == "OnePlus"), None)
        assert op is not None, "OnePlus brand missing"
        assert "12" in op["models"], f"got {op['models']}"

    def test_legacy_and_color_only_products_excluded(self, vb_payload):
        """Color swatch product (prod_ffd936f15deb) and legacy variant products
        (prod_tg001 / prod_cs001) have no options.brand and must NOT contribute
        spurious brand entries."""
        brands = {e["brand"] for e in vb_payload}
        # No color names should leak into brands list
        for spurious in ("Crimson Red", "Ocean Blue", "Forest Green", "Color", "Red", "Blue"):
            assert spurious not in brands, f"spurious brand entry: {spurious}"

    def test_models_are_sorted_and_unique(self, vb_payload):
        for entry in vb_payload:
            assert entry["models"] == sorted(set(entry["models"])), \
                f"models not sorted/unique for {entry['brand']}: {entry['models']}"

    def test_brands_are_sorted(self, vb_payload):
        names = [e["brand"] for e in vb_payload]
        assert names == sorted(names), f"brands not sorted: {names}"

    def test_category_filter_narrows_results(self):
        r = requests.get(f"{BASE_URL}/api/variant-brands", params={"category": "Tempered Glass"})
        assert r.status_code == 200
        data = r.json()
        # iPhone/Samsung/OnePlus are seeded under Tempered Glass (prod_927e589bb547)
        brands = {e["brand"] for e in data}
        assert "iPhone" in brands


# ── GET /api/products?variant_brand=... filtering ──
class TestProductsVariantFilter:
    def test_variant_brand_iphone_only(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"variant_brand": "iPhone"})
        assert r.status_code == 200, r.text
        products = r.json()
        assert isinstance(products, list)
        assert len(products) > 0, "expected at least 1 product matching variant_brand=iPhone"
        for p in products:
            variants = p.get("variants") or []
            has_iphone = any((v.get("options") or {}).get("brand") == "iPhone" for v in variants)
            assert has_iphone, f"product {p.get('product_id')} returned without iPhone variant option"
        # The seeded brand-cascade product must be present
        ids = {p["product_id"] for p in products}
        assert "prod_927e589bb547" in ids

    def test_variant_brand_and_model_combined(self):
        r = requests.get(f"{BASE_URL}/api/products", params={
            "variant_brand": "iPhone", "variant_model": "15 Pro"
        })
        assert r.status_code == 200, r.text
        products = r.json()
        assert len(products) > 0
        for p in products:
            variants = p.get("variants") or []
            ok = any(
                (v.get("options") or {}).get("brand") == "iPhone"
                and (v.get("options") or {}).get("model") == "15 Pro"
                for v in variants
            )
            assert ok, f"product {p.get('product_id')} doesn't have iPhone/15 Pro variant"

    def test_variant_model_only_excludes_brand_mismatch(self):
        # Asking for a brand+model where only the brand exists must not match a *different* brand
        # that happens to share a model name. Use a model that exists under iPhone (15) but request
        # under Samsung — must return empty.
        r = requests.get(f"{BASE_URL}/api/products", params={
            "variant_brand": "Samsung", "variant_model": "15 Pro"
        })
        assert r.status_code == 200
        # No product has Samsung/15 Pro variant combo
        for p in r.json():
            variants = p.get("variants") or []
            assert not any(
                (v.get("options") or {}).get("brand") == "Samsung"
                and (v.get("options") or {}).get("model") == "15 Pro"
                for v in variants
            )

    def test_variant_brand_unknown_returns_empty(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"variant_brand": "DoesNotExistBrand_XYZ"})
        assert r.status_code == 200
        assert r.json() == []


# ── GET /api/products?search=... matches via variants ──
class TestProductsSearchVariants:
    def test_search_iphone_matches_via_variant(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"search": "iPhone"})
        assert r.status_code == 200
        products = r.json()
        ids = {p["product_id"] for p in products}
        # Seeded product must surface even though "iPhone" lives only inside variants.options.brand
        assert "prod_927e589bb547" in ids, \
            f"search=iPhone did not return the variant-cascade seed. Got ids={ids}"

    def test_search_samsung_matches_via_variant(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"search": "Samsung"})
        assert r.status_code == 200
        ids = {p["product_id"] for p in r.json()}
        assert "prod_927e589bb547" in ids

    def test_search_s24_ultra_matches_via_variant_model(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"search": "S24 Ultra"})
        assert r.status_code == 200
        ids = {p["product_id"] for p in r.json()}
        assert "prod_927e589bb547" in ids


# ── Regression: pre-existing query params still work ──
class TestProductsLegacyParams:
    def test_legacy_category_filter(self):
        r = requests.get(f"{BASE_URL}/api/products", params={"category": "Tempered Glass"})
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "Tempered Glass"

    def test_legacy_brand_filter_still_works(self):
        # Pick a brand from /api/brands
        b = requests.get(f"{BASE_URL}/api/brands").json()
        if not b:
            pytest.skip("no brands seeded")
        target = b[0]
        r = requests.get(f"{BASE_URL}/api/products", params={"brand": target})
        assert r.status_code == 200
        for p in r.json():
            assert p["brand"] == target

    def test_legacy_search_name_field_still_works(self):
        # Pick first product, search by an exact word in its name
        all_p = requests.get(f"{BASE_URL}/api/products").json()
        assert all_p, "no products seeded"
        first = all_p[0]
        token = first["name"].split()[0]
        r = requests.get(f"{BASE_URL}/api/products", params={"search": token})
        assert r.status_code == 200
        ids = {p["product_id"] for p in r.json()}
        assert first["product_id"] in ids

    def test_no_params_returns_all(self):
        r = requests.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
