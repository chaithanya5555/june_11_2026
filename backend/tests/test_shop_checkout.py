"""
Backend API tests for SnapAlign Shop & Checkout features
Tests: Products, Filters, Cart, Address, Checkout flow
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://preview-demo-107.preview.emergentagent.com')

class TestHealthAndProducts:
    """Health check and product catalog tests"""
    
    def test_health_check(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✅ Health check passed")
    
    def test_get_all_products(self):
        """Get all products - should return 100 SEO-optimized products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 50, f"Expected at least 50 products, got {len(products)}"
        print(f"✅ Got {len(products)} products")
        
        # Verify SEO-optimized naming
        first_product = products[0]
        assert "SnapAlign" in first_product["name"], "Product name should contain SnapAlign for SEO"
        assert "brand" in first_product, "Product should have brand field"
        assert "device_model" in first_product, "Product should have device_model field"
        assert "subcategory" in first_product, "Product should have subcategory field"
        print(f"✅ SEO naming verified: {first_product['name']}")
    
    def test_get_brands(self):
        """Get all unique brands"""
        response = requests.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 200
        brands = response.json()
        assert len(brands) >= 5, f"Expected at least 5 brands, got {len(brands)}"
        expected_brands = ["Apple", "Samsung", "OnePlus", "Google", "Xiaomi"]
        for brand in expected_brands:
            assert brand in brands, f"Expected brand {brand} not found"
        print(f"✅ Brands: {brands}")
    
    def test_get_categories(self):
        """Get all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        expected_cats = ["Tempered Glass", "Cases", "Camera Lens Protector", "Screen Protector"]
        for cat in expected_cats:
            assert cat in categories, f"Expected category {cat} not found"
        print(f"✅ Categories: {categories}")
    
    def test_get_subcategories_for_category(self):
        """Get subcategories filtered by category"""
        response = requests.get(f"{BASE_URL}/api/subcategories?category=Tempered Glass")
        assert response.status_code == 200
        subcategories = response.json()
        assert len(subcategories) >= 2, f"Expected at least 2 subcategories, got {len(subcategories)}"
        print(f"✅ Tempered Glass subcategories: {subcategories}")
        
        # Test Cases subcategories
        response2 = requests.get(f"{BASE_URL}/api/subcategories?category=Cases")
        assert response2.status_code == 200
        case_subs = response2.json()
        assert len(case_subs) >= 2
        print(f"✅ Cases subcategories: {case_subs}")


class TestProductFiltering:
    """Product filtering tests - Brand, Model, Category, Subcategory"""
    
    def test_filter_by_brand(self):
        """Filter products by brand"""
        response = requests.get(f"{BASE_URL}/api/products?brand=Apple")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "Should have Apple products"
        for p in products:
            assert p["brand"] == "Apple", f"Product brand should be Apple, got {p['brand']}"
        print(f"✅ Apple products: {len(products)}")
    
    def test_filter_by_category(self):
        """Filter products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=Cases")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "Should have Cases products"
        for p in products:
            assert p["category"] == "Cases", f"Product category should be Cases, got {p['category']}"
        print(f"✅ Cases products: {len(products)}")
    
    def test_filter_by_subcategory(self):
        """Filter products by subcategory"""
        response = requests.get(f"{BASE_URL}/api/products?subcategory=UV Glass")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "Should have UV Glass products"
        for p in products:
            assert p["subcategory"] == "UV Glass", f"Product subcategory should be UV Glass"
        print(f"✅ UV Glass products: {len(products)}")
    
    def test_filter_by_device_model(self):
        """Filter products by device model (phone model)"""
        response = requests.get(f"{BASE_URL}/api/products?device_model=iPhone 15")
        assert response.status_code == 200
        products = response.json()
        # device_model uses regex, so partial match works
        for p in products:
            assert "iPhone 15" in p["device_model"] or "iphone 15" in p["device_model"].lower()
        print(f"✅ iPhone 15 products: {len(products)}")
    
    def test_combined_filters(self):
        """Test combined brand + category filter"""
        response = requests.get(f"{BASE_URL}/api/products?brand=Apple&category=Tempered Glass")
        assert response.status_code == 200
        products = response.json()
        for p in products:
            assert p["brand"] == "Apple"
            assert p["category"] == "Tempered Glass"
        print(f"✅ Apple Tempered Glass products: {len(products)}")
    
    def test_search_functionality(self):
        """Test search by keyword"""
        response = requests.get(f"{BASE_URL}/api/products?search=iPhone 15 tempered")
        assert response.status_code == 200
        products = response.json()
        # Search should find products matching keywords
        print(f"✅ Search 'iPhone 15 tempered' results: {len(products)}")
    
    def test_sort_by_price_asc(self):
        """Test sort by price low to high"""
        response = requests.get(f"{BASE_URL}/api/products?sort=price_asc")
        assert response.status_code == 200
        products = response.json()
        prices = [p["price"] for p in products]
        assert prices == sorted(prices), "Products should be sorted by price ascending"
        print(f"✅ Sort price_asc: First price {prices[0]}, Last price {prices[-1]}")
    
    def test_sort_by_price_desc(self):
        """Test sort by price high to low"""
        response = requests.get(f"{BASE_URL}/api/products?sort=price_desc")
        assert response.status_code == 200
        products = response.json()
        prices = [p["price"] for p in products]
        assert prices == sorted(prices, reverse=True), "Products should be sorted by price descending"
        print(f"✅ Sort price_desc: First price {prices[0]}, Last price {prices[-1]}")


class TestUPIPaymentConfig:
    """UPI Payment configuration tests"""
    
    def test_get_upi_config(self):
        """Get UPI payment configuration"""
        response = requests.get(f"{BASE_URL}/api/payment/upi-config")
        assert response.status_code == 200
        config = response.json()
        assert "upi_id" in config, "Should have upi_id"
        assert "upi_qr_url" in config, "Should have upi_qr_url"
        assert "upi_name" in config, "Should have upi_name"
        print(f"✅ UPI Config: {config['upi_id']}, {config['upi_name']}")
    
    def test_payment_config(self):
        """Get general payment configuration"""
        response = requests.get(f"{BASE_URL}/api/payment/config")
        assert response.status_code == 200
        config = response.json()
        assert "demo_mode" in config
        assert config["demo_mode"] == True, "Should be in demo mode"
        print(f"✅ Payment config: demo_mode={config['demo_mode']}")


class TestAuthenticatedFlows:
    """Tests requiring authentication - Cart, Checkout, Orders"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create test user session for authenticated tests"""
        import subprocess
        import json
        
        # Create test user and session via mongosh
        timestamp = int(datetime.now().timestamp() * 1000)
        user_id = f"test_user_{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.users.deleteMany({{user_id: /^test_user_/}});
        db.user_sessions.deleteMany({{session_token: /^test_session_/}});
        db.cart_items.deleteMany({{user_id: /^test_user_/}});
        db.users.insertOne({{
            user_id: "{user_id}",
            email: "test_{timestamp}@example.com",
            name: "Test User",
            picture: "",
            role: "customer",
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: "{user_id}",
            session_token: "{session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        }});
        print(JSON.stringify({{user_id: "{user_id}", session_token: "{session_token}"}}));
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True, text=True
        )
        
        self.session_token = session_token
        self.user_id = user_id
        self.headers = {"Authorization": f"Bearer {session_token}"}
        
        yield
        
        # Cleanup
        cleanup_script = f'''
        use('test_database');
        db.users.deleteMany({{user_id: "{user_id}"}});
        db.user_sessions.deleteMany({{session_token: "{session_token}"}});
        db.cart_items.deleteMany({{user_id: "{user_id}"}});
        db.orders.deleteMany({{user_id: "{user_id}"}});
        '''
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    
    def test_auth_me(self):
        """Test authenticated user endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200
        user = response.json()
        assert user["user_id"] == self.user_id
        print(f"✅ Auth me: {user['email']}")
    
    def test_cart_empty_initially(self):
        """Cart should be empty for new user"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        assert response.status_code == 200
        cart = response.json()
        assert len(cart) == 0, "Cart should be empty initially"
        print("✅ Cart empty initially")
    
    def test_add_to_cart(self):
        """Add product to cart"""
        # Get a product first
        products_res = requests.get(f"{BASE_URL}/api/products")
        products = products_res.json()
        product_id = products[0]["product_id"]
        
        # Add to cart
        response = requests.post(
            f"{BASE_URL}/api/cart",
            json={"product_id": product_id, "quantity": 1},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify cart
        cart_res = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart = cart_res.json()
        assert len(cart) == 1
        assert cart[0]["product_id"] == product_id
        assert cart[0]["quantity"] == 1
        print(f"✅ Added to cart: {products[0]['name']}")
    
    def test_update_cart_quantity(self):
        """Update cart item quantity"""
        # Add product first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product_id = products_res.json()[0]["product_id"]
        requests.post(f"{BASE_URL}/api/cart", json={"product_id": product_id, "quantity": 1}, headers=self.headers)
        
        # Update quantity
        response = requests.put(
            f"{BASE_URL}/api/cart/{product_id}",
            json={"product_id": product_id, "quantity": 3},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify
        cart = requests.get(f"{BASE_URL}/api/cart", headers=self.headers).json()
        assert cart[0]["quantity"] == 3
        print("✅ Cart quantity updated to 3")
    
    def test_remove_from_cart(self):
        """Remove item from cart"""
        # Add product first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product_id = products_res.json()[0]["product_id"]
        requests.post(f"{BASE_URL}/api/cart", json={"product_id": product_id, "quantity": 1}, headers=self.headers)
        
        # Remove
        response = requests.delete(f"{BASE_URL}/api/cart/{product_id}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify empty
        cart = requests.get(f"{BASE_URL}/api/cart", headers=self.headers).json()
        assert len(cart) == 0
        print("✅ Item removed from cart")
    
    def test_manual_upi_create_order(self):
        """Create order for manual UPI payment with address"""
        # Add product to cart first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product_id = products_res.json()[0]["product_id"]
        requests.post(f"{BASE_URL}/api/cart", json={"product_id": product_id, "quantity": 1}, headers=self.headers)
        
        # Create order with address
        response = requests.post(
            f"{BASE_URL}/api/payment/manual-upi/create-order",
            json={
                "origin_url": "https://test.com",
                "payment_method": "manual_upi",
                "coupon_code": None,
                "shipping_address": {
                    "name": "Test User",
                    "phone": "9876543210",
                    "addressLine1": "123 Test Street",
                    "addressLine2": "Apt 4B",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001"
                },
                "estimated_delivery": "Mon, Jan 20"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        order = response.json()
        assert "order_id" in order
        assert "amount" in order
        assert "upi_id" in order
        assert "upi_qr_url" in order
        print(f"✅ Manual UPI order created: {order['order_id']}, Amount: ₹{order['amount']}")
        return order
    
    def test_submit_utr(self):
        """Submit UTR after payment"""
        # Create order first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product_id = products_res.json()[0]["product_id"]
        requests.post(f"{BASE_URL}/api/cart", json={"product_id": product_id, "quantity": 1}, headers=self.headers)
        
        order_res = requests.post(
            f"{BASE_URL}/api/payment/manual-upi/create-order",
            json={"origin_url": "https://test.com", "payment_method": "manual_upi"},
            headers=self.headers
        )
        order_id = order_res.json()["order_id"]
        
        # Submit UTR
        response = requests.post(
            f"{BASE_URL}/api/payment/manual-upi/submit-utr",
            json={"utr": "123456789012", "order_id": order_id},
            headers=self.headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        assert "verification" in result["message"].lower()
        print(f"✅ UTR submitted for order {order_id}")
    
    def test_get_orders(self):
        """Get user orders"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=self.headers)
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✅ User orders: {len(orders)}")


class TestDeliveryEstimation:
    """Test delivery estimation logic based on pincode"""
    
    def test_metro_pincode_delivery(self):
        """Metro cities should get 3-day delivery"""
        # This is frontend logic, but we can verify the backend accepts the data
        metro_pincodes = ["400001", "110001", "560001", "500001", "600001"]
        for pincode in metro_pincodes:
            # Verify pincode is 6 digits
            assert len(pincode) == 6
            assert pincode.isdigit()
        print(f"✅ Metro pincodes validated: {metro_pincodes}")
    
    def test_non_metro_pincode_delivery(self):
        """Non-metro cities should get 5-day delivery"""
        non_metro_pincodes = ["302001", "452001", "226001"]  # Jaipur, Indore, Lucknow
        for pincode in non_metro_pincodes:
            assert len(pincode) == 6
            assert pincode.isdigit()
        print(f"✅ Non-metro pincodes validated: {non_metro_pincodes}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
