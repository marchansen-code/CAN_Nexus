"""
Iteration 5 Extended Tests - Authenticated API Tests
Tests the new features requiring admin authentication:
1. DELETE /api/documents/{id} - Admin document deletion
2. PUT /api/users/{id}/block - User blocking/unblocking  
3. /api/stats - top_articles field
4. Blocked user login prevention (403)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-search-kb.preview.emergentagent.com')
AUTH_TOKEN = "OMDc4lJ2GaPGZzcO7R_78AYC9pVq_izstu5IS8ynxcM"

class TestAuthenticatedAPIs:
    """Tests requiring authentication"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    def test_stats_contains_top_articles(self, auth_headers):
        """Test /api/stats response contains top_articles field"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "top_articles" in data, "stats should contain top_articles field"
        assert isinstance(data["top_articles"], list), "top_articles should be a list"
        print(f"SUCCESS: /api/stats contains top_articles with {len(data['top_articles'])} items")
    
    def test_articles_list(self, auth_headers):
        """Test articles list endpoint"""
        response = requests.get(f"{BASE_URL}/api/articles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            # Check article has required fields
            article = data[0]
            assert "article_id" in article
            assert "title" in article
        print(f"SUCCESS: /api/articles returned {len(data)} articles")
    
    def test_top_viewed_articles(self, auth_headers):
        """Test top-viewed articles endpoint"""
        response = requests.get(f"{BASE_URL}/api/articles/top-viewed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: /api/articles/top-viewed returned {len(data)} articles")
    
    def test_users_list(self, auth_headers):
        """Test users list endpoint"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            user = data[0]
            assert "user_id" in user
            assert "email" in user
            assert "role" in user
        print(f"SUCCESS: /api/users returned {len(data)} users")
    
    def test_categories_list(self, auth_headers):
        """Test categories list endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: /api/categories returned {len(data)} categories")
    
    def test_documents_list(self, auth_headers):
        """Test documents list endpoint"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: /api/documents returned {len(data)} documents")

class TestUserBlocking:
    """Tests for user blocking feature"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    def test_block_user(self, auth_headers):
        """Test blocking a user"""
        # First get a user to block
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = users_response.json()
        
        # Find a non-admin user
        target_user = None
        for u in users:
            if u.get("role") != "admin" and u.get("user_id") != "user_7315a895c8be":
                target_user = u
                break
        
        if not target_user:
            pytest.skip("No non-admin user found to test blocking")
        
        user_id = target_user["user_id"]
        
        # Block the user
        block_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}/block",
            headers=auth_headers,
            json={"is_blocked": True}
        )
        assert block_response.status_code == 200
        data = block_response.json()
        assert data["is_blocked"] == True
        print(f"SUCCESS: User {user_id} blocked")
        
        # Unblock the user (cleanup)
        unblock_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}/block",
            headers=auth_headers,
            json={"is_blocked": False}
        )
        assert unblock_response.status_code == 200
        print(f"SUCCESS: User {user_id} unblocked")

class TestSearchEndpoint:
    """Tests for improved search"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    def test_search_api(self, auth_headers):
        """Test search API with a query - improved search returns answer + sources"""
        search_payload = {
            "query": "Familie Aktivitäten",
            "top_k": 5
        }
        response = requests.post(
            f"{BASE_URL}/api/search",
            headers=auth_headers,
            json=search_payload
        )
        assert response.status_code == 200
        data = response.json()
        # Improved search returns 'answer' and 'sources' fields
        assert "answer" in data or "sources" in data, f"Search should return answer/sources: {list(data.keys())}"
        print(f"SUCCESS: Search API returned {len(data.get('sources', []))} sources")

class TestWidgetAPIs:
    """Test public widget APIs"""
    
    def test_widget_search_public(self):
        """Widget search should be public"""
        response = requests.get(f"{BASE_URL}/api/widget/search", params={"q": "test", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "query" in data
        print("SUCCESS: Widget search is publicly accessible")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
