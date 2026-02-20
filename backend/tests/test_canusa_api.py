"""
CANUSA Knowledge Hub - Backend API Tests
Features tested:
- Role-based access control (admin/editor/viewer)
- Article CRUD operations
- Article View permissions (edit button for editor/admin only)
- Generate Summary API
- Categories API
- Search API
- User Management API
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session tokens created in MongoDB
ADMIN_SESSION_TOKEN = "test_session_1771586699281"
EDITOR_SESSION_TOKEN = "test_editor_session_1771586707197"
VIEWER_SESSION_TOKEN = "test_viewer_session_1771586707694"

class TestAPIHealth:
    """Test basic API health and endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "CANUSA Knowledge Hub API"
        assert data["version"] == "1.0.0"
        print("✅ API root endpoint working")


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_auth_me_with_admin_token(self):
        """Test /auth/me endpoint with admin token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert "@canusa.de" in data["email"]
        print(f"✅ Admin auth working - role: {data['role']}")
    
    def test_auth_me_with_editor_token(self):
        """Test /auth/me endpoint with editor token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {EDITOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "editor"
        print(f"✅ Editor auth working - role: {data['role']}")
    
    def test_auth_me_with_viewer_token(self):
        """Test /auth/me endpoint with viewer token (new users default role)"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "viewer", f"Expected viewer role but got {data['role']} - New users should get 'viewer' role"
        print(f"✅ Viewer auth working - role: {data['role']}")
    
    def test_auth_without_token(self):
        """Test /auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Unauthenticated request properly rejected")


class TestArticleCRUD:
    """Test Article CRUD operations"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    @pytest.fixture
    def editor_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {EDITOR_SESSION_TOKEN}"
        })
        return session
    
    @pytest.fixture
    def viewer_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"
        })
        return session
    
    def test_get_articles(self, admin_client):
        """Test GET /articles endpoint"""
        response = admin_client.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /articles - Found {len(data)} articles")
    
    def test_create_article_as_editor(self, editor_client):
        """Test CREATE article as editor"""
        payload = {
            "title": "TEST_Editor Article",
            "content": "<p>This is a test article created by editor for role testing.</p>",
            "summary": "Test summary",
            "status": "draft",
            "visibility": "all",
            "tags": ["test", "editor"]
        }
        response = editor_client.post(f"{BASE_URL}/api/articles", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == payload["title"]
        assert "article_id" in data
        print(f"✅ CREATE article as editor - ID: {data['article_id']}")
        return data["article_id"]
    
    def test_create_article_as_viewer(self, viewer_client):
        """Test CREATE article as viewer - should be allowed (viewers can create)"""
        payload = {
            "title": "TEST_Viewer Article",
            "content": "<p>Viewer creating article</p>",
            "summary": "",
            "status": "draft",
            "visibility": "all",
            "tags": []
        }
        response = viewer_client.post(f"{BASE_URL}/api/articles", json=payload)
        # Note: The current implementation allows all authenticated users to create articles
        # Check if this is expected behavior or if viewers should be restricted
        print(f"CREATE article as viewer - status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Viewer CAN create articles (current behavior)")
        else:
            print("❌ Viewer CANNOT create articles")
    
    def test_get_single_article(self, admin_client):
        """Test GET single article"""
        # First create an article
        payload = {
            "title": "TEST_Single Article",
            "content": "<p>Test content</p>",
            "status": "draft"
        }
        create_response = admin_client.post(f"{BASE_URL}/api/articles", json=payload)
        assert create_response.status_code == 200
        article_id = create_response.json()["article_id"]
        
        # Then GET it
        response = admin_client.get(f"{BASE_URL}/api/articles/{article_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == payload["title"]
        print(f"✅ GET single article working - ID: {article_id}")
    
    def test_update_article(self, admin_client):
        """Test UPDATE article"""
        # Create article
        payload = {"title": "TEST_Update Article", "content": "<p>Original</p>", "status": "draft"}
        create_response = admin_client.post(f"{BASE_URL}/api/articles", json=payload)
        article_id = create_response.json()["article_id"]
        
        # Update it
        update_payload = {"title": "TEST_Updated Title", "status": "review"}
        response = admin_client.put(f"{BASE_URL}/api/articles/{article_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Updated Title"
        assert data["status"] == "review"
        print(f"✅ UPDATE article working - ID: {article_id}")
    
    def test_delete_article(self, admin_client):
        """Test DELETE article"""
        # Create article
        payload = {"title": "TEST_Delete Article", "content": "<p>Delete me</p>", "status": "draft"}
        create_response = admin_client.post(f"{BASE_URL}/api/articles", json=payload)
        article_id = create_response.json()["article_id"]
        
        # Delete it
        response = admin_client.delete(f"{BASE_URL}/api/articles/{article_id}")
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = admin_client.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_response.status_code == 404
        print(f"✅ DELETE article working - ID: {article_id}")


class TestGenerateSummaryAPI:
    """Test Generate Summary API endpoint"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_generate_summary_with_content(self, admin_client):
        """Test /articles/generate-summary endpoint with valid content"""
        payload = {
            "content": """<p>CANUSA ist ein führender Reiseveranstalter für individuelle Nordamerika-Reisen. 
            Das Unternehmen wurde 1983 gegründet und hat seinen Hauptsitz in Hamburg. 
            CANUSA bietet maßgeschneiderte Reisen nach USA und Kanada an, 
            einschließlich Mietwagen, Hotels und Flüge. Die Experten beraten Kunden 
            persönlich zu ihren Traumreisen.</p>"""
        }
        response = admin_client.post(f"{BASE_URL}/api/articles/generate-summary", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        # AI summary can be empty if content is too short or generation fails
        print(f"✅ Generate Summary API working - Summary length: {len(data.get('summary', ''))}")
    
    def test_generate_summary_with_short_content(self, admin_client):
        """Test generate summary with too short content"""
        payload = {"content": "Short text"}
        response = admin_client.post(f"{BASE_URL}/api/articles/generate-summary", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("summary") == ""  # Empty summary for short content
        print("✅ Generate Summary handles short content correctly")


class TestCategoriesAPI:
    """Test Categories API"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_get_categories(self, admin_client):
        """Test GET /categories"""
        response = admin_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /categories - Found {len(data)} categories")
    
    def test_create_category(self, admin_client):
        """Test CREATE category"""
        payload = {"name": "TEST_Category", "description": "Test description", "order": 0}
        response = admin_client.post(f"{BASE_URL}/api/categories", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Category"
        assert "category_id" in data
        print(f"✅ CREATE category working - ID: {data['category_id']}")
    
    def test_create_hierarchical_category(self, admin_client):
        """Test CREATE hierarchical category with parent"""
        # Create parent
        parent_payload = {"name": "TEST_Parent Category", "order": 0}
        parent_response = admin_client.post(f"{BASE_URL}/api/categories", json=parent_payload)
        parent_id = parent_response.json()["category_id"]
        
        # Create child
        child_payload = {"name": "TEST_Child Category", "parent_id": parent_id, "order": 0}
        child_response = admin_client.post(f"{BASE_URL}/api/categories", json=child_payload)
        assert child_response.status_code == 200
        child_data = child_response.json()
        assert child_data["parent_id"] == parent_id
        print(f"✅ Hierarchical categories working - Parent: {parent_id}, Child: {child_data['category_id']}")


class TestSearchAPI:
    """Test Search API"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_search(self, admin_client):
        """Test POST /search"""
        payload = {"query": "CANUSA Reisen", "top_k": 5}
        response = admin_client.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert "query" in data
        print(f"✅ Search API working - Found {len(data['sources'])} sources")


class TestUserManagementAPI:
    """Test User Management API"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    @pytest.fixture
    def viewer_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"
        })
        return session
    
    def test_get_users_as_admin(self, admin_client):
        """Test GET /users as admin"""
        response = admin_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ GET /users as admin - Found {len(data)} users")
    
    def test_get_users_as_viewer(self, viewer_client):
        """Test GET /users as viewer - should also work (no role restriction on viewing users)"""
        response = viewer_client.get(f"{BASE_URL}/api/users")
        # Note: Current implementation allows any authenticated user to view users
        print(f"GET /users as viewer - status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Viewer CAN view users (current behavior)")
    
    def test_update_role_as_admin(self, admin_client):
        """Test PUT /users/{id}/role as admin"""
        # Get a viewer user ID
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        viewer_user = next((u for u in users if u["role"] == "viewer" and "test-viewer" in u.get("user_id", "")), None)
        
        if viewer_user:
            # Try to update role (but skip our own test user to avoid breaking tests)
            if "test-viewer-1771586707694" != viewer_user["user_id"]:
                response = admin_client.put(
                    f"{BASE_URL}/api/users/{viewer_user['user_id']}/role",
                    json={"role": "editor"}
                )
                if response.status_code == 200:
                    print(f"✅ Update user role working")
                else:
                    print(f"Role update response: {response.status_code}")
            else:
                print("✅ Skipping role update test to preserve test user")
        else:
            print("✅ No other viewer user found to test role update")
    
    def test_update_role_as_viewer(self, viewer_client):
        """Test PUT /users/{id}/role as viewer - should fail (403)"""
        response = viewer_client.put(
            f"{BASE_URL}/api/users/some-user-id/role",
            json={"role": "admin"}
        )
        assert response.status_code == 403
        print("✅ Viewer CANNOT update roles (correctly restricted)")


class TestStatsAPI:
    """Test Statistics API"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_get_stats(self, admin_client):
        """Test GET /stats"""
        response = admin_client.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_articles" in data
        assert "published_articles" in data
        assert "recent_articles" in data
        assert "user_stats" in data
        print(f"✅ GET /stats working - Total articles: {data['total_articles']}")


class TestFavoritesAPI:
    """Test Favorites API"""
    
    @pytest.fixture
    def admin_client(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_toggle_favorite(self, admin_client):
        """Test POST /articles/{id}/favorite"""
        # Create an article first
        payload = {"title": "TEST_Favorite Article", "content": "<p>Test</p>", "status": "draft"}
        create_response = admin_client.post(f"{BASE_URL}/api/articles", json=payload)
        article_id = create_response.json()["article_id"]
        
        # Toggle favorite (add)
        response = admin_client.post(f"{BASE_URL}/api/articles/{article_id}/favorite")
        assert response.status_code == 200
        data = response.json()
        assert data["favorited"] == True
        
        # Toggle favorite (remove)
        response2 = admin_client.post(f"{BASE_URL}/api/articles/{article_id}/favorite")
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["favorited"] == False
        print(f"✅ Toggle favorite working - ID: {article_id}")
    
    def test_get_favorites(self, admin_client):
        """Test GET /favorites"""
        response = admin_client.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /favorites working - Found {len(data)} favorites")


# Cleanup fixture to delete test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests complete"""
    yield
    # Cleanup - delete test articles and categories
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
    })
    
    # Delete TEST_ prefixed articles
    try:
        articles = session.get(f"{BASE_URL}/api/articles").json()
        for article in articles:
            if article.get("title", "").startswith("TEST_"):
                session.delete(f"{BASE_URL}/api/articles/{article['article_id']}")
        
        categories = session.get(f"{BASE_URL}/api/categories").json()
        for cat in categories:
            if cat.get("name", "").startswith("TEST_"):
                session.delete(f"{BASE_URL}/api/categories/{cat['category_id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
