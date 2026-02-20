import requests
import sys
import json
from datetime import datetime

class BackendAPITester:
    def __init__(self, base_url="https://smart-knowledge-hub-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}" if endpoint else self.api_base
        
        test_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:500]}...")
                except:
                    response_data = {}
            else:
                response_data = {"text": response.text[:200]}
                print(f"   Response (text): {response.text[:200]}...")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append({
                    "name": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response_data
                })

            return success, response_data

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                "name": name,
                "error": str(e)
            })
            return False, {}

    def test_basic_endpoints(self):
        """Test basic unauthenticated endpoints"""
        print("=" * 60)
        print("TESTING BASIC ENDPOINTS")
        print("=" * 60)
        
        # Root API endpoint
        self.run_test("Root API", "GET", "", 200)
        
        # Widget endpoints (public)
        self.run_test("Widget Search", "GET", "widget/search?q=test&limit=3", 200)

    def test_auth_endpoints_without_token(self):
        """Test that protected endpoints return 401 without token"""
        print("=" * 60)
        print("TESTING AUTH PROTECTION (should return 401)")
        print("=" * 60)
        
        # Should be protected
        self.run_test("Stats (no auth)", "GET", "stats", 401)
        self.run_test("Categories (no auth)", "GET", "categories", 401)
        self.run_test("Articles (no auth)", "GET", "articles", 401)

    def setup_test_session(self):
        """Set up test session for authenticated testing"""
        print("=" * 60)
        print("SETTING UP TEST SESSION")
        print("=" * 60)
        
        # For testing purposes, we'll use a test session token
        # In a real scenario, this would come from auth_testing.md setup
        test_session_token = f"test_session_{int(datetime.now().timestamp())}"
        
        print(f"Using test session token: {test_session_token}")
        print("⚠️  Note: This requires test user session to be created in MongoDB")
        print("   Follow /app/auth_testing.md for proper setup")
        
        self.session_token = test_session_token
        return True

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        if not self.session_token:
            print("❌ No session token available for authenticated tests")
            return
            
        print("=" * 60)
        print("TESTING AUTHENTICATED ENDPOINTS")
        print("=" * 60)
        
        # Test /auth/me first to verify session
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success and user_data.get("user_id"):
            self.user_id = user_data["user_id"]
            print(f"   Authenticated as: {user_data.get('name', 'Unknown')}")
        
        # Test stats
        self.run_test("Dashboard Stats", "GET", "stats", 200)
        
        # Test categories CRUD
        category_data = {"name": "Test Category", "description": "Test category description"}
        success, category = self.run_test("Create Category", "POST", "categories", 200, category_data)
        
        if success and category.get("category_id"):
            category_id = category["category_id"]
            self.run_test("Get Categories", "GET", "categories", 200)
            
            # Update category
            update_data = {"name": "Updated Test Category", "description": "Updated description"}
            self.run_test("Update Category", "PUT", f"categories/{category_id}", 200, update_data)
            
            # Delete category
            self.run_test("Delete Category", "DELETE", f"categories/{category_id}", 200)
        
        # Test articles CRUD
        article_data = {
            "title": "Test Article",
            "content": "This is a test article content.",
            "summary": "Test summary",
            "status": "draft"
        }
        success, article = self.run_test("Create Article", "POST", "articles", 200, article_data)
        
        if success and article.get("article_id"):
            article_id = article["article_id"]
            self.run_test("Get Articles", "GET", "articles", 200)
            self.run_test("Get Single Article", "GET", f"articles/{article_id}", 200)
            
            # Update article
            update_data = {"title": "Updated Test Article", "status": "review"}
            self.run_test("Update Article", "PUT", f"articles/{article_id}", 200, update_data)
            
            # Delete article
            self.run_test("Delete Article", "DELETE", f"articles/{article_id}", 200)
        
        # Test documents endpoints
        self.run_test("Get Documents", "GET", "documents", 200)
        
        # Test search functionality
        search_data = {"query": "test", "top_k": 5}
        self.run_test("Semantic Search", "POST", "search", 200, search_data)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Smart-Knowledge-Nexus Backend API Tests")
        print("=" * 80)
        
        # Test basic endpoints
        self.test_basic_endpoints()
        
        # Test auth protection
        self.test_auth_endpoints_without_token()
        
        # Setup test session
        self.setup_test_session()
        
        # Test authenticated endpoints
        self.test_authenticated_endpoints()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("TEST RESULTS SUMMARY")
        print("=" * 80)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                if 'error' in test:
                    print(f"  - {test['name']}: {test['error']}")
                else:
                    print(f"  - {test['name']}: Expected {test.get('expected')}, got {test.get('actual')}")
        
        print("\n💡 IMPORTANT NOTES:")
        print("  - For authenticated tests to pass, you must first create a test user session")
        print("  - Follow the instructions in /app/auth_testing.md")
        print("  - Some tests may fail if MongoDB is empty (no test data)")
        print("  - Document upload requires multipart/form-data (not tested here)")
        
        return self.tests_passed == self.tests_run

def main():
    tester = BackendAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())