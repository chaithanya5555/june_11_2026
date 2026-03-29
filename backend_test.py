import requests
import sys
import json
from datetime import datetime

class SnapAlignAPITester:
    def __init__(self, base_url="https://snapalign-store.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f" - {error_data['detail']}"
                except:
                    pass
            
            self.log_test(name, success, details)
            
            return success, response.json() if response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def create_test_session(self):
        """Create a test user and session using mongosh"""
        print("\n🔧 Creating test user and session...")
        import subprocess
        
        timestamp = int(datetime.now().timestamp())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongosh_script = f"""
        use('test_database');
        var userId = '{user_id}';
        var sessionToken = '{session_token}';
        db.users.insertOne({{
          user_id: userId,
          email: 'test.user.{timestamp}@example.com',
          name: 'Test User',
          picture: 'https://via.placeholder.com/150',
          role: 'admin',
          created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
          created_at: new Date().toISOString()
        }});
        print('Session created successfully');
        """
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongosh_script], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                print(f"✅ Test session created: {session_token[:20]}...")
                return True
            else:
                print(f"❌ Failed to create test session: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error creating test session: {str(e)}")
            return False

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n📋 Testing Public Endpoints...")
        
        # Test products endpoint
        success, data = self.run_test("Get all products", "GET", "products", 200)
        if success and isinstance(data, list):
            product_count = len(data)
            self.log_test(f"Products count check (expected 15)", product_count == 15, 
                         f"Found {product_count} products")
        
        # Test category filtering
        self.run_test("Filter by Chargers category", "GET", "products?category=Chargers", 200)
        
        # Test search functionality
        self.run_test("Search for 'cable'", "GET", "products?search=cable", 200)
        
        # Test specific product detail
        self.run_test("Get product detail (prod_case001)", "GET", "products/prod_case001", 200)
        
        # Test categories endpoint
        self.run_test("Get categories", "GET", "categories", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Auth Endpoints...")
        
        # Test unauthenticated access
        self.run_test("Auth check without token (should fail)", "GET", "auth/me", 401)
        self.run_test("Cart access without token (should fail)", "GET", "cart", 401)
        
        # Test with valid session token
        if self.session_token:
            self.run_test("Auth check with valid token", "GET", "auth/me", 200)

    def test_cart_operations(self):
        """Test cart CRUD operations"""
        if not self.session_token:
            print("⚠️ Skipping cart tests - no valid session")
            return
            
        print("\n🛒 Testing Cart Operations...")
        
        # Get empty cart
        self.run_test("Get empty cart", "GET", "cart", 200)
        
        # Add item to cart
        cart_data = {"product_id": "prod_case001", "quantity": 2}
        self.run_test("Add item to cart", "POST", "cart", 200, cart_data)
        
        # Get cart with items
        success, cart = self.run_test("Get cart with items", "GET", "cart", 200)
        
        # Update cart item
        update_data = {"product_id": "prod_case001", "quantity": 3}
        self.run_test("Update cart item", "PUT", "cart/prod_case001", 200, update_data)
        
        # Remove item from cart
        self.run_test("Remove item from cart", "DELETE", "cart/prod_case001", 200)

    def test_wishlist_operations(self):
        """Test wishlist operations"""
        if not self.session_token:
            print("⚠️ Skipping wishlist tests - no valid session")
            return
            
        print("\n❤️ Testing Wishlist Operations...")
        
        # Get empty wishlist
        self.run_test("Get empty wishlist", "GET", "wishlist", 200)
        
        # Toggle wishlist (add)
        self.run_test("Add to wishlist", "POST", "wishlist/prod_case001", 200)
        
        # Toggle wishlist (remove)
        self.run_test("Remove from wishlist", "POST", "wishlist/prod_case001", 200)

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        if not self.session_token:
            print("⚠️ Skipping admin tests - no valid session")
            return
            
        print("\n👑 Testing Admin Endpoints...")
        
        # Get admin stats
        self.run_test("Get admin stats", "GET", "admin/stats", 200)
        
        # Get admin orders
        self.run_test("Get admin orders", "GET", "admin/orders", 200)
        
        # Get admin products
        self.run_test("Get admin products", "GET", "admin/products", 200)
        
        # Test product creation
        new_product = {
            "name": "Test Product",
            "description": "A test product for API testing",
            "price": 19.99,
            "category": "Phone Cases",
            "image": "https://via.placeholder.com/400",
            "stock": 50,
            "featured": False
        }
        success, product = self.run_test("Create new product", "POST", "admin/products", 201, new_product)
        
        if success and 'product_id' in product:
            product_id = product['product_id']
            
            # Test product update
            update_data = {"name": "Updated Test Product", "price": 24.99}
            self.run_test("Update product", "PUT", f"admin/products/{product_id}", 200, update_data)
            
            # Test product deletion
            self.run_test("Delete product", "DELETE", f"admin/products/{product_id}", 200)

    def test_review_system(self):
        """Test product review system"""
        if not self.session_token:
            print("⚠️ Skipping review tests - no valid session")
            return
            
        print("\n⭐ Testing Review System...")
        
        # Add a review
        review_data = {"rating": 5, "comment": "Great product! Highly recommended."}
        self.run_test("Add product review", "POST", "products/prod_case001/reviews", 200, review_data)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting SnapAlign API Tests...")
        print(f"Backend URL: {self.base_url}")
        
        # Test public endpoints first
        self.test_public_endpoints()
        
        # Create test session for authenticated tests
        if self.create_test_session():
            self.test_auth_endpoints()
            self.test_cart_operations()
            self.test_wishlist_operations()
            self.test_review_system()
            self.test_admin_endpoints()
        else:
            print("⚠️ Skipping authenticated tests - failed to create test session")
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SnapAlignAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())