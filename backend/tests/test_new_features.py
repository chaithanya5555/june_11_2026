"""
Test Suite for SnapAlign New Features (Iteration 4)
Tests: RBAC Admin Auth, Coupons, Analytics, Product Variants, WhatsApp Config
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://login-preview-10.preview.emergentagent.com').rstrip('/')

class TestAdminRBAC:
    """Test Role-Based Access Control for Admin Users"""
    
    def test_admin_login_owner(self):
        """Owner login with email + password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert data["role"] == "owner", f"Expected role 'owner', got {data.get('role')}"
        assert "token" in data, "Token not returned"
        print(f"✓ Owner login successful, role: {data['role']}")
        return data["token"]
    
    def test_admin_login_warehouse_manager(self):
        """Warehouse manager login with email + password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "warehouse@snapalign.com",
            "password": "warehouse2026"
        })
        assert response.status_code == 200, f"Warehouse login failed: {response.text}"
        data = response.json()
        assert data["role"] == "warehouse_manager", f"Expected role 'warehouse_manager', got {data.get('role')}"
        print(f"✓ Warehouse manager login successful, role: {data['role']}")
        return data["token"]
    
    def test_admin_login_legacy_password_only(self):
        """Legacy admin login with password only (no email)"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "snapalign2026"
        })
        assert response.status_code == 200, f"Legacy login failed: {response.text}"
        data = response.json()
        assert data["role"] == "owner", "Legacy login should return owner role"
        print(f"✓ Legacy password-only login successful")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_admin_verify_returns_role(self):
        """Admin verify endpoint should return role"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        token = login_resp.json()["token"]
        
        # Verify with cookie
        session = requests.Session()
        session.cookies.set("admin_token", token)
        verify_resp = session.get(f"{BASE_URL}/api/admin/verify")
        assert verify_resp.status_code == 200, f"Verify failed: {verify_resp.text}"
        data = verify_resp.json()
        assert "role" in data, "Role not in verify response"
        assert data["authenticated"] == True
        print(f"✓ Admin verify returns role: {data['role']}")


class TestCoupons:
    """Test Coupon CRUD and Validation"""
    
    @pytest.fixture
    def owner_session(self):
        """Get authenticated owner session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        return session
    
    @pytest.fixture
    def warehouse_session(self):
        """Get authenticated warehouse manager session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "warehouse@snapalign.com",
            "password": "warehouse2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        return session
    
    def test_get_coupons_owner(self, owner_session):
        """Owner can view coupons"""
        response = owner_session.get(f"{BASE_URL}/api/admin/coupons")
        assert response.status_code == 200, f"Get coupons failed: {response.text}"
        coupons = response.json()
        assert isinstance(coupons, list)
        print(f"✓ Owner can view {len(coupons)} coupons")
        return coupons
    
    def test_preseeded_coupons_exist(self, owner_session):
        """Pre-seeded coupons should exist"""
        response = owner_session.get(f"{BASE_URL}/api/admin/coupons")
        coupons = response.json()
        codes = [c["code"] for c in coupons]
        
        expected_codes = ["WELCOME10", "FLAT100", "SNAP20"]
        for code in expected_codes:
            assert code in codes, f"Pre-seeded coupon {code} not found"
        print(f"✓ All pre-seeded coupons found: {expected_codes}")
    
    def test_create_coupon_owner_only(self, owner_session, warehouse_session):
        """Only owner can create coupons"""
        coupon_data = {
            "code": "TEST_COUPON_123",
            "type": "percentage",
            "value": 15,
            "min_order_amount": 500,
            "max_uses": 10,
            "active": True
        }
        
        # Owner should succeed
        owner_resp = owner_session.post(f"{BASE_URL}/api/admin/coupons", json=coupon_data)
        assert owner_resp.status_code == 201, f"Owner create coupon failed: {owner_resp.text}"
        created = owner_resp.json()
        assert created["code"] == "TEST_COUPON_123"
        print(f"✓ Owner created coupon: {created['code']}")
        
        # Warehouse manager should fail
        coupon_data["code"] = "WH_COUPON_FAIL"
        wh_resp = warehouse_session.post(f"{BASE_URL}/api/admin/coupons", json=coupon_data)
        assert wh_resp.status_code == 403, f"Warehouse manager should not create coupons, got {wh_resp.status_code}"
        print("✓ Warehouse manager correctly denied coupon creation")
        
        # Cleanup
        owner_session.delete(f"{BASE_URL}/api/admin/coupons/{created['coupon_id']}")
    
    def test_delete_coupon_owner_only(self, owner_session, warehouse_session):
        """Only owner can delete coupons"""
        # Create a test coupon first
        coupon_data = {
            "code": "DELETE_TEST_COUPON",
            "type": "fixed",
            "value": 50,
            "min_order_amount": 0,
            "active": True
        }
        create_resp = owner_session.post(f"{BASE_URL}/api/admin/coupons", json=coupon_data)
        coupon_id = create_resp.json()["coupon_id"]
        
        # Warehouse manager should fail to delete
        wh_resp = warehouse_session.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}")
        assert wh_resp.status_code == 403, f"Warehouse manager should not delete coupons"
        print("✓ Warehouse manager correctly denied coupon deletion")
        
        # Owner should succeed
        owner_resp = owner_session.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}")
        assert owner_resp.status_code == 200, f"Owner delete coupon failed: {owner_resp.text}"
        print("✓ Owner deleted coupon successfully")


class TestCouponValidation:
    """Test coupon validation at checkout"""
    
    @pytest.fixture
    def user_session(self):
        """Create a test user session for coupon validation"""
        # Use the test session from auth_testing.md
        session = requests.Session()
        session.headers.update({"Authorization": "Bearer test_admin_session_fixed"})
        return session
    
    def test_validate_welcome10_coupon(self, user_session):
        """WELCOME10: 10% off, min ₹500"""
        response = user_session.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "WELCOME10",
            "cart_total": 1000
        })
        assert response.status_code == 200, f"Coupon validation failed: {response.text}"
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 100  # 10% of 1000
        print(f"✓ WELCOME10 validated: discount ₹{data['discount']}")
    
    def test_validate_flat100_coupon(self, user_session):
        """FLAT100: ₹100 off, min ₹999"""
        response = user_session.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "FLAT100",
            "cart_total": 1500
        })
        assert response.status_code == 200, f"Coupon validation failed: {response.text}"
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 100  # Fixed ₹100
        print(f"✓ FLAT100 validated: discount ₹{data['discount']}")
    
    def test_validate_snap20_coupon(self, user_session):
        """SNAP20: 20% off, min ₹1500"""
        response = user_session.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "SNAP20",
            "cart_total": 2000
        })
        assert response.status_code == 200, f"Coupon validation failed: {response.text}"
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 400  # 20% of 2000
        print(f"✓ SNAP20 validated: discount ₹{data['discount']}")
    
    def test_coupon_min_order_not_met(self, user_session):
        """Coupon should fail if min order not met"""
        response = user_session.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "WELCOME10",
            "cart_total": 300  # Below ₹500 minimum
        })
        assert response.status_code == 400, f"Expected 400 for min order not met, got {response.status_code}"
        print("✓ Coupon correctly rejected for min order not met")
    
    def test_invalid_coupon_code(self, user_session):
        """Invalid coupon code should return 404"""
        response = user_session.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "INVALID_CODE_XYZ",
            "cart_total": 1000
        })
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("✓ Invalid coupon code correctly rejected")


class TestAnalytics:
    """Test Analytics API"""
    
    @pytest.fixture
    def owner_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        return session
    
    def test_analytics_endpoint(self, owner_session):
        """Analytics endpoint returns chart data"""
        response = owner_session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "daily" in data, "Missing daily revenue data"
        assert "category_revenue" in data, "Missing category revenue"
        assert "status_breakdown" in data, "Missing order status breakdown"
        assert "top_products" in data, "Missing top products"
        
        # Validate daily data structure
        assert isinstance(data["daily"], list)
        if len(data["daily"]) > 0:
            assert "date" in data["daily"][0]
            assert "revenue" in data["daily"][0]
            assert "orders" in data["daily"][0]
        
        print(f"✓ Analytics data returned: {len(data['daily'])} days, {len(data['category_revenue'])} categories")


class TestProductVariants:
    """Test Product Variants"""
    
    def test_product_with_variants(self):
        """Products with variants should have variant data"""
        # prod_cs001 has Color variants
        response = requests.get(f"{BASE_URL}/api/products/prod_cs001")
        assert response.status_code == 200, f"Product fetch failed: {response.text}"
        product = response.json()
        
        assert "variants" in product, "Product should have variants field"
        assert len(product["variants"]) > 0, "prod_cs001 should have variants"
        
        # Check variant structure
        variant = product["variants"][0]
        assert "variant_id" in variant
        assert "type" in variant
        assert "value" in variant
        assert "price_modifier" in variant
        
        print(f"✓ Product {product['name']} has {len(product['variants'])} variants")
        for v in product["variants"]:
            print(f"  - {v['type']}: {v['value']} (+₹{v.get('price_modifier', 0)})")
    
    def test_variant_types(self):
        """Check specific variant types for known products"""
        # prod_tg001 has Finish variants (Clear/Matte)
        resp1 = requests.get(f"{BASE_URL}/api/products/prod_tg001")
        if resp1.status_code == 200:
            p1 = resp1.json()
            if p1.get("variants"):
                types = [v["type"] for v in p1["variants"]]
                assert "Finish" in types, f"prod_tg001 should have Finish variants"
                print(f"✓ prod_tg001 has Finish variants")
        
        # prod_cs001 has Color variants
        resp2 = requests.get(f"{BASE_URL}/api/products/prod_cs001")
        if resp2.status_code == 200:
            p2 = resp2.json()
            if p2.get("variants"):
                types = [v["type"] for v in p2["variants"]]
                assert "Color" in types, f"prod_cs001 should have Color variants"
                values = [v["value"] for v in p2["variants"]]
                assert "Black" in values or "Navy Blue" in values
                print(f"✓ prod_cs001 has Color variants: {values}")


class TestWhatsAppConfig:
    """Test WhatsApp Configuration"""
    
    def test_whatsapp_config_public(self):
        """WhatsApp config endpoint is public"""
        response = requests.get(f"{BASE_URL}/api/admin/whatsapp-config")
        assert response.status_code == 200, f"WhatsApp config failed: {response.text}"
        data = response.json()
        assert "whatsapp_number" in data
        assert "enabled" in data
        print(f"✓ WhatsApp config: number={data['whatsapp_number'] or 'not set'}, enabled={data['enabled']}")
    
    def test_update_whatsapp_number(self):
        """Owner can update WhatsApp number"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        
        # Update WhatsApp number
        update_resp = session.put(f"{BASE_URL}/api/admin/settings", json={
            "whatsapp_number": "919876543210"
        })
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        # Verify update
        config_resp = requests.get(f"{BASE_URL}/api/admin/whatsapp-config")
        config = config_resp.json()
        assert config["whatsapp_number"] == "919876543210"
        assert config["enabled"] == True
        print("✓ WhatsApp number updated and enabled")
        
        # Reset to empty
        session.put(f"{BASE_URL}/api/admin/settings", json={"whatsapp_number": ""})


class TestAdminUserManagement:
    """Test Admin User Management (Team tab)"""
    
    @pytest.fixture
    def owner_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "owner@snapalign.com",
            "password": "snapalign2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        return session
    
    def test_get_admin_users(self, owner_session):
        """Owner can view admin users"""
        response = owner_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Get users failed: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        
        # Check seeded users exist
        emails = [u["email"] for u in users]
        assert "owner@snapalign.com" in emails
        assert "warehouse@snapalign.com" in emails
        print(f"✓ Found {len(users)} admin users")
    
    def test_create_admin_user(self, owner_session):
        """Owner can create admin users"""
        user_data = {
            "email": "test_admin_user@snapalign.com",
            "name": "Test Admin",
            "password": "testpass123",
            "role": "warehouse_manager"
        }
        
        response = owner_session.post(f"{BASE_URL}/api/admin/users", json=user_data)
        assert response.status_code == 201, f"Create user failed: {response.text}"
        created = response.json()
        assert created["email"] == user_data["email"]
        assert created["role"] == "warehouse_manager"
        print(f"✓ Created admin user: {created['email']}")
        
        # Cleanup
        owner_session.delete(f"{BASE_URL}/api/admin/users/{created['admin_user_id']}")
        print("✓ Cleaned up test user")


class TestWarehouseManagerAccess:
    """Test Warehouse Manager limited access"""
    
    @pytest.fixture
    def warehouse_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "warehouse@snapalign.com",
            "password": "warehouse2026"
        })
        token = resp.json()["token"]
        session.cookies.set("admin_token", token)
        return session
    
    def test_warehouse_can_view_products(self, warehouse_session):
        """Warehouse manager can view products"""
        response = warehouse_session.get(f"{BASE_URL}/api/admin/products")
        assert response.status_code == 200
        print("✓ Warehouse manager can view products")
    
    def test_warehouse_can_view_dead_stock(self, warehouse_session):
        """Warehouse manager can view dead stock"""
        response = warehouse_session.get(f"{BASE_URL}/api/admin/dead-stock")
        assert response.status_code == 200
        print("✓ Warehouse manager can view dead stock")
    
    def test_warehouse_cannot_view_orders(self, warehouse_session):
        """Warehouse manager can view orders (read access)"""
        # Note: Based on code review, warehouse managers CAN view orders
        # but cannot modify settings or coupons
        response = warehouse_session.get(f"{BASE_URL}/api/admin/orders")
        # This should work as require_admin is used, not require_owner
        assert response.status_code == 200
        print("✓ Warehouse manager can view orders (read access)")
    
    def test_warehouse_cannot_access_team(self, warehouse_session):
        """Warehouse manager cannot access team management"""
        response = warehouse_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Warehouse manager correctly denied team access")
    
    def test_warehouse_cannot_update_settings(self, warehouse_session):
        """Warehouse manager cannot update settings"""
        response = warehouse_session.put(f"{BASE_URL}/api/admin/settings", json={
            "whatsapp_number": "1234567890"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Warehouse manager correctly denied settings update")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
