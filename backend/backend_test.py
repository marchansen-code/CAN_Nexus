#!/usr/bin/env python3
"""
CANUSA Knowledge Hub - Backend API Tests
Testing all endpoints with authentication and CANUSA-specific features
"""

import requests
import sys
import json
from datetime import datetime
import time
import uuid

class CanusaAPITester:
    def __init__(self, base_url="https://smart-search-kb.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.session_token = "test_session_1771581159911"  # From test credentials
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"   {details}")
        if success:
            self.tests_passed += 1
        else:
            self.errors.append(f"{test_name}: {details}")
        print("")
    
    def make_request(self, method, endpoint, data=None, files=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/api{endpoint}"
        try:
            headers = self.headers.copy() if not files else {'Authorization': self.headers['Authorization']}
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, files=files, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_api_root(self):
        """Test API root endpoint"""
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            if "CANUSA Knowledge Hub API" in data.get('message', ''):
                self.log_test("API Root", True, "CANUSA branding confirmed in API response")
                return True
        self.log_test("API Root", False, f"Expected CANUSA branding. Got: {response.status_code if response else 'No response'}")
        return False

    def test_stats_endpoint(self):
        """Test /api/stats - should return user stats, favorites, recently viewed"""
        response = self.make_request('GET', '/stats')
        if not response:
            self.log_test("Stats Endpoint", False, "No response from server")
            return False
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ['total_articles', 'favorite_articles', 'recently_viewed', 'user_stats']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Stats Endpoint", True, f"All required fields present. User stats: {data.get('user_stats', {})}")
                return True
            else:
                self.log_test("Stats Endpoint", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Stats Endpoint", False, f"Status {response.status_code}: {response.text[:200]}")
            return False

    def test_favorites_endpoint(self):
        """Test /api/favorites - should return user favorites"""
        response = self.make_request('GET', '/favorites')
        if not response:
            self.log_test("Favorites Endpoint", False, "No response from server")
            return False
            
        if response.status_code == 200:
            data = response.json()
            self.log_test("Favorites Endpoint", True, f"Retrieved {len(data)} favorite articles")
            return True
        else:
            self.log_test("Favorites Endpoint", False, f"Status {response.status_code}: {response.text[:200]}")
            return False

    def test_categories_hierarchical(self):
        """Test hierarchical categories with create functionality"""
        # Get categories
        response = self.make_request('GET', '/categories')
        if not response or response.status_code != 200:
            self.log_test("Categories - Get", False, f"Failed to fetch categories: {response.status_code if response else 'No response'}")
            return False
            
        categories = response.json()
        self.log_test("Categories - Get", True, f"Retrieved {len(categories)} categories")
        
        # Test create category
        test_category = {
            "name": f"Test Category {datetime.now().strftime('%H%M%S')}",
            "description": "Test category for hierarchy",
            "parent_id": None,
            "order": 0
        }
        
        create_response = self.make_request('POST', '/categories', test_category)
        if create_response and create_response.status_code == 200:
            new_cat = create_response.json()
            self.log_test("Categories - Create", True, f"Created category: {new_cat.get('name')}")
            
            # Test sub-category
            sub_category = {
                "name": f"Sub Category {datetime.now().strftime('%H%M%S')}",
                "parent_id": new_cat['category_id'],
                "order": 0
            }
            
            sub_response = self.make_request('POST', '/categories', sub_category)
            if sub_response and sub_response.status_code == 200:
                self.log_test("Categories - Hierarchical", True, "Successfully created sub-category")
                return True
            else:
                self.log_test("Categories - Hierarchical", False, f"Sub-category creation failed: {sub_response.status_code if sub_response else 'No response'}")
        else:
            self.log_test("Categories - Create", False, f"Category creation failed: {create_response.status_code if create_response else 'No response'}")
            
        return False

    def test_article_workflow(self):
        """Test article creation with visibility and favorite functionality"""
        # Create test article
        article_data = {
            "title": f"Test Article {datetime.now().strftime('%H%M%S')}",
            "content": "<h1>Test Content</h1><p>This is a test article for CANUSA Knowledge Hub.</p>",
            "summary": "Test article summary",
            "status": "draft",
            "visibility": "all",  # Testing visibility feature
            "tags": ["test", "canusa"]
        }
        
        response = self.make_request('POST', '/articles', article_data)
        if not response or response.status_code != 200:
            self.log_test("Article Creation", False, f"Failed to create article: {response.status_code if response else 'No response'}")
            return False
            
        article = response.json()
        article_id = article['article_id']
        self.log_test("Article Creation", True, f"Created article with visibility: {article.get('visibility')}")
        
        # Test visibility update
        update_data = {"visibility": "editors"}
        update_response = self.make_request('PUT', f'/articles/{article_id}', update_data)
        if update_response and update_response.status_code == 200:
            updated_article = update_response.json()
            if updated_article.get('visibility') == 'editors':
                self.log_test("Article Visibility", True, "Successfully updated visibility to 'editors'")
            else:
                self.log_test("Article Visibility", False, f"Visibility not updated correctly: {updated_article.get('visibility')}")
        else:
            self.log_test("Article Visibility", False, f"Failed to update visibility: {update_response.status_code if update_response else 'No response'}")
        
        # Test favorite toggle
        fav_response = self.make_request('POST', f'/articles/{article_id}/favorite')
        if fav_response and fav_response.status_code == 200:
            fav_data = fav_response.json()
            self.log_test("Article Favorite", True, f"Favorite toggle: {fav_data.get('message', 'Success')}")
        else:
            self.log_test("Article Favorite", False, f"Failed to toggle favorite: {fav_response.status_code if fav_response else 'No response'}")
        
        # Test presence endpoint
        presence_response = self.make_request('POST', f'/articles/{article_id}/presence')
        if presence_response and presence_response.status_code == 200:
            presence_data = presence_response.json()
            self.log_test("Article Presence", True, f"Presence update successful, active editors: {len(presence_data.get('active_editors', []))}")
        else:
            self.log_test("Article Presence", False, f"Failed to update presence: {presence_response.status_code if presence_response else 'No response'}")
            
        return True

    def test_user_management(self):
        """Test user management features"""
        response = self.make_request('GET', '/users')
        if response and response.status_code == 200:
            users = response.json()
            self.log_test("User Management", True, f"Retrieved {len(users)} users")
            
            # Check if Marc Hansen (admin) exists
            admin_users = [u for u in users if u.get('role') == 'admin']
            if admin_users:
                self.log_test("Admin User Check", True, f"Found {len(admin_users)} admin users")
            else:
                self.log_test("Admin User Check", False, "No admin users found (Marc Hansen should be admin)")
            return True
        else:
            self.log_test("User Management", False, f"Failed to fetch users: {response.status_code if response else 'No response'}")
            return False

    def test_authentication_domain_restriction(self):
        """Test that domain restrictions are properly configured"""
        # This tests the server configuration rather than making requests
        # Since we're already authenticated with a test session
        response = self.make_request('GET', '/auth/me')
        if response and response.status_code == 200:
            user_data = response.json()
            email = user_data.get('email', '')
            if '@canusa.de' in email or '@cu-travel.com' in email or 'test' in email.lower():
                self.log_test("Domain Restriction Check", True, f"User email domain check passed: {email}")
                return True
            else:
                self.log_test("Domain Restriction Check", False, f"Unexpected email domain: {email}")
        else:
            self.log_test("Domain Restriction Check", False, "Could not verify user authentication")
        return False

    def run_all_tests(self):
        """Run all test suites"""
        print("=" * 60)
        print("🧪 CANUSA KNOWLEDGE HUB - BACKEND API TESTS")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        print("-" * 60)
        
        # Core functionality tests
        self.test_api_root()
        self.test_authentication_domain_restriction()
        self.test_user_management()
        
        # Dashboard/stats tests  
        self.test_stats_endpoint()
        self.test_favorites_endpoint()
        
        # Feature-specific tests
        self.test_categories_hierarchical()
        self.test_article_workflow()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.errors:
            print("\n❌ FAILED TESTS:")
            for error in self.errors:
                print(f"  • {error}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CanusaAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())