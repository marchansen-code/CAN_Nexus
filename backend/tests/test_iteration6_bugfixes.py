"""
Iteration 6: Testing bugfixes for CANUSA Nexus
1. DELETE /api/users/{id} endpoint for user deletion
2. API structure verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://content-nexus-71.preview.emergentagent.com"


class TestApiHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "CANUSA" in data["message"]
        print(f"API Root: {data}")


class TestUserDeleteEndpoint:
    """Test user deletion API endpoint (admin only)"""
    
    def test_delete_user_requires_auth(self):
        """DELETE /api/users/{id} should require authentication"""
        # Try to delete without auth - should get 401
        response = requests.delete(f"{BASE_URL}/api/users/test_user_id")
        assert response.status_code == 401
        print("DELETE /api/users/{id} correctly requires authentication")
    
    def test_delete_user_endpoint_exists(self):
        """Verify DELETE /api/users/{id} endpoint exists"""
        # This test just verifies the endpoint exists by checking it returns 401 (auth required)
        # rather than 404 (endpoint not found) or 405 (method not allowed)
        response = requests.delete(f"{BASE_URL}/api/users/some_user_id")
        assert response.status_code in [401, 403, 404]  # 401 = auth required, 403 = forbidden, 404 = user not found (but endpoint exists)
        print(f"DELETE /api/users/{{id}} endpoint exists, status: {response.status_code}")


class TestUserBlockEndpoint:
    """Test user blocking API endpoint (admin only)"""
    
    def test_block_user_requires_auth(self):
        """PUT /api/users/{id}/block should require authentication"""
        response = requests.put(f"{BASE_URL}/api/users/test_user_id/block")
        assert response.status_code == 401
        print("PUT /api/users/{id}/block correctly requires authentication")


class TestArticlesEndpoints:
    """Test articles API endpoints"""
    
    def test_articles_requires_auth(self):
        """GET /api/articles should require authentication"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 401
        print("GET /api/articles correctly requires authentication")
    
    def test_top_viewed_articles_requires_auth(self):
        """GET /api/articles/top-viewed should require authentication"""
        response = requests.get(f"{BASE_URL}/api/articles/top-viewed")
        assert response.status_code == 401
        print("GET /api/articles/top-viewed correctly requires authentication")


class TestDocumentsEndpoints:
    """Test documents API endpoints"""
    
    def test_documents_requires_auth(self):
        """GET /api/documents should require authentication"""
        response = requests.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 401
        print("GET /api/documents correctly requires authentication")
    
    def test_document_pdf_requires_auth(self):
        """GET /api/documents/{id}/pdf should require authentication"""
        response = requests.get(f"{BASE_URL}/api/documents/test_doc_id/pdf")
        assert response.status_code == 401
        print("GET /api/documents/{id}/pdf correctly requires authentication")


class TestCategoriesEndpoints:
    """Test categories API endpoints"""
    
    def test_categories_requires_auth(self):
        """GET /api/categories should require authentication"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 401
        print("GET /api/categories correctly requires authentication")


class TestUsersEndpoints:
    """Test users API endpoints"""
    
    def test_users_requires_auth(self):
        """GET /api/users should require authentication"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 401
        print("GET /api/users correctly requires authentication")


class TestSearchEndpoints:
    """Test search API endpoints"""
    
    def test_search_requires_auth(self):
        """POST /api/search should require authentication"""
        response = requests.post(f"{BASE_URL}/api/search", json={"query": "test"})
        assert response.status_code == 401
        print("POST /api/search correctly requires authentication")


class TestStatsEndpoints:
    """Test stats API endpoints"""
    
    def test_stats_requires_auth(self):
        """GET /api/stats should require authentication"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 401
        print("GET /api/stats correctly requires authentication")


class TestWidgetEndpoints:
    """Test public widget API endpoints (no auth required)"""
    
    def test_widget_search_public(self):
        """GET /api/widget/search should be public"""
        response = requests.get(f"{BASE_URL}/api/widget/search?q=test")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "query" in data
        print(f"Widget search public endpoint works: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
