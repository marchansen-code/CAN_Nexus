"""
Iteration 9: Test new features
1. POST /api/auth/login - Login with email/password (replacing Google Auth)
2. GET /api/auth/me - Get current user
3. POST /api/auth/logout - Logout user
4. POST /api/users - Create new user (Admin only)
5. PUT /api/users/{id}/password - Change password (Admin only)
6. POST /api/search - Keyword-based search
7. GET /api/search/quick - Ajax quick search for autocomplete
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from problem statement
ADMIN_EMAIL = "marc.hansen@canusa.de"
ADMIN_PASSWORD = "CanusaNexus2024!"

# Test user for creation/deletion
TEST_USER_PREFIX = "TEST_iter9_"

@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "stay_logged_in": False
        }
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session

@pytest.fixture(scope="module")
def admin_token(admin_session):
    """Extract session token from admin login"""
    cookies = admin_session.cookies.get_dict()
    session_token = cookies.get("session_token")
    return session_token

@pytest.fixture
def auth_headers(admin_token):
    """Return auth headers with admin session token"""
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}


class TestAuthLogin:
    """Tests for POST /api/auth/login - Email/Password authentication"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "stay_logged_in": False
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert "name" in data, "Response should contain name"
        assert "role" in data, "Response should contain role"
        
        # Validate values
        assert data["email"] == ADMIN_EMAIL, "Email should match"
        assert data["role"] == "admin", "Role should be admin"
        assert data.get("is_blocked") == False, "User should not be blocked"
        
        # Session cookie should be set
        assert "session_token" in response.cookies, "Session cookie should be set"
    
    def test_login_stay_logged_in_true(self):
        """Test login with stay_logged_in=True (30 days)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "stay_logged_in": True
            }
        )
        
        assert response.status_code == 200
        # Cookie should have longer expiry (30 days)
        cookie = response.cookies.get("session_token")
        assert cookie is not None
    
    def test_login_invalid_email(self):
        """Test login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@test.de",
                "password": "SomePassword123",
                "stay_logged_in": False
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        # German error message
        assert "Ungültige" in data["detail"] or "ungültige" in data["detail"]
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": "WrongPassword123!",
                "stay_logged_in": False
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_login_missing_fields(self):
        """Test login with missing required fields"""
        # Missing password
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL}
        )
        assert response.status_code == 422
        
        # Missing email
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"password": "SomePass"}
        )
        assert response.status_code == 422


class TestAuthMe:
    """Tests for GET /api/auth/me - Get current user"""
    
    def test_get_me_authenticated(self, admin_session):
        """Test getting current user when authenticated"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
    
    def test_get_me_not_authenticated(self):
        """Test getting current user without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestAuthLogout:
    """Tests for POST /api/auth/logout - Logout user"""
    
    def test_logout_success(self):
        """Test successful logout"""
        # First login
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "stay_logged_in": False
            }
        )
        assert login_response.status_code == 200
        
        # Now logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "message" in data
        assert "abgemeldet" in data["message"].lower() or "logout" in data["message"].lower()
        
        # Session should be invalid now
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 401
    
    def test_logout_without_session(self):
        """Test logout without active session (should still return 200)"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        
        # Should still return 200 even without session
        assert response.status_code == 200


class TestUserCreation:
    """Tests for POST /api/users - Create new user (Admin only)"""
    
    def test_create_user_as_admin(self, admin_session):
        """Test creating a new user as admin"""
        test_email = f"{TEST_USER_PREFIX}{uuid.uuid4().hex[:8]}@test.de"
        
        response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": test_email,
                "password": "TestPassword123!",
                "name": "Test User Iter9",
                "role": "viewer"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user_id" in data
        assert data["email"] == test_email.lower()
        assert data["name"] == "Test User Iter9"
        assert data["role"] == "viewer"
        
        # Cleanup - delete created user
        admin_session.delete(f"{BASE_URL}/api/users/{data['user_id']}")
    
    def test_create_user_duplicate_email(self, admin_session):
        """Test creating user with duplicate email fails"""
        response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": ADMIN_EMAIL,  # Already exists
                "password": "TestPassword123!",
                "name": "Duplicate User",
                "role": "viewer"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "bereits" in data["detail"] or "exist" in data["detail"].lower()
    
    def test_create_user_invalid_role(self, admin_session):
        """Test creating user with invalid role fails"""
        response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": f"{TEST_USER_PREFIX}invalid_role@test.de",
                "password": "TestPassword123!",
                "name": "Invalid Role User",
                "role": "superadmin"  # Invalid role
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_create_user_without_auth(self):
        """Test creating user without authentication fails"""
        response = requests.post(
            f"{BASE_URL}/api/users",
            json={
                "email": f"{TEST_USER_PREFIX}noauth@test.de",
                "password": "TestPassword123!",
                "name": "No Auth User",
                "role": "viewer"
            }
        )
        
        assert response.status_code == 401


class TestPasswordChange:
    """Tests for PUT /api/users/{id}/password - Change password (Admin only)"""
    
    def test_change_password_as_admin(self, admin_session):
        """Test changing user password as admin"""
        # First create a test user
        test_email = f"{TEST_USER_PREFIX}pwchange_{uuid.uuid4().hex[:8]}@test.de"
        create_response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": test_email,
                "password": "OldPassword123!",
                "name": "Password Change Test",
                "role": "viewer"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Change password
        response = admin_session.put(
            f"{BASE_URL}/api/users/{user_id}/password",
            json={"new_password": "NewPassword456!"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify new password works
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": "NewPassword456!",
                "stay_logged_in": False
            }
        )
        assert login_response.status_code == 200
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_change_password_too_short(self, admin_session):
        """Test changing password with too short password fails"""
        # First create a test user
        test_email = f"{TEST_USER_PREFIX}pwshort_{uuid.uuid4().hex[:8]}@test.de"
        create_response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": test_email,
                "password": "ValidPassword123!",
                "name": "Short Password Test",
                "role": "viewer"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Try to change to short password
        response = admin_session.put(
            f"{BASE_URL}/api/users/{user_id}/password",
            json={"new_password": "short"}  # Less than 6 chars
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "6" in data["detail"] or "zeichen" in data["detail"].lower()
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_change_password_nonexistent_user(self, admin_session):
        """Test changing password for non-existent user fails"""
        response = admin_session.put(
            f"{BASE_URL}/api/users/nonexistent_user_id/password",
            json={"new_password": "ValidPassword123!"}
        )
        
        assert response.status_code == 404


class TestKeywordSearch:
    """Tests for POST /api/search - Keyword-based search"""
    
    def test_search_basic_query(self, admin_session):
        """Test basic keyword search"""
        # First ensure we have at least one article
        # Create a test article
        article_response = admin_session.post(
            f"{BASE_URL}/api/articles",
            json={
                "title": f"{TEST_USER_PREFIX}Westkanada Reiseführer",
                "content": "Informationen über Westkanada Reisen und Hotels in Vancouver.",
                "summary": "Ein umfassender Reiseführer für Westkanada",
                "status": "published"
            }
        )
        article_id = None
        if article_response.status_code == 200:
            article_id = article_response.json().get("article_id")
        
        # Now search
        response = admin_session.post(
            f"{BASE_URL}/api/search",
            json={
                "query": "Westkanada",
                "top_k": 10
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "results" in data
        assert "query" in data
        assert data["query"] == "Westkanada"
        
        # Results should be a list
        assert isinstance(data["results"], list)
        
        # If we have results, check structure
        if len(data["results"]) > 0:
            result = data["results"][0]
            assert "article_id" in result
            assert "title" in result
            assert "content_snippet" in result
            assert "score" in result
        
        # Cleanup
        if article_id:
            admin_session.delete(f"{BASE_URL}/api/articles/{article_id}")
    
    def test_search_empty_query(self, admin_session):
        """Test search with empty query returns empty results"""
        response = admin_session.post(
            f"{BASE_URL}/api/search",
            json={
                "query": "",
                "top_k": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
    
    def test_search_short_query(self, admin_session):
        """Test search with too short query (< 2 chars) returns empty"""
        response = admin_session.post(
            f"{BASE_URL}/api/search",
            json={
                "query": "a",  # Only 1 character
                "top_k": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
    
    def test_search_with_category_filter(self, admin_session):
        """Test search with category_id filter"""
        response = admin_session.post(
            f"{BASE_URL}/api/search",
            json={
                "query": "Test",
                "top_k": 10,
                "category_id": "nonexistent_category"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_requires_auth(self):
        """Test search requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "test", "top_k": 10}
        )
        
        assert response.status_code == 401


class TestQuickSearch:
    """Tests for GET /api/search/quick - Ajax quick search for autocomplete"""
    
    def test_quick_search_basic(self, admin_session):
        """Test basic quick search"""
        # Create a test article first
        article_response = admin_session.post(
            f"{BASE_URL}/api/articles",
            json={
                "title": f"{TEST_USER_PREFIX}Mietwagen Vancouver",
                "content": "Informationen über Mietwagen in Vancouver und Umgebung.",
                "summary": "Mietwagen buchen in Vancouver",
                "status": "published"
            }
        )
        article_id = None
        if article_response.status_code == 200:
            article_id = article_response.json().get("article_id")
        
        # Now quick search
        response = admin_session.get(
            f"{BASE_URL}/api/search/quick",
            params={"q": "Mietwagen", "limit": 5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        
        # Check result structure if we have results
        if len(data["results"]) > 0:
            result = data["results"][0]
            assert "article_id" in result
            assert "title" in result
            assert "summary" in result
        
        # Cleanup
        if article_id:
            admin_session.delete(f"{BASE_URL}/api/articles/{article_id}")
    
    def test_quick_search_short_query(self, admin_session):
        """Test quick search with short query returns empty"""
        response = admin_session.get(
            f"{BASE_URL}/api/search/quick",
            params={"q": "a", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
    
    def test_quick_search_limit(self, admin_session):
        """Test quick search respects limit parameter"""
        response = admin_session.get(
            f"{BASE_URL}/api/search/quick",
            params={"q": "test", "limit": 2}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) <= 2
    
    def test_quick_search_requires_auth(self):
        """Test quick search requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/search/quick",
            params={"q": "test", "limit": 5}
        )
        
        assert response.status_code == 401


class TestUserManagementByAdmin:
    """Additional tests for user management features"""
    
    def test_get_all_users_as_admin(self, admin_session):
        """Test getting all users as admin"""
        response = admin_session.get(f"{BASE_URL}/api/users")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least admin user
        assert len(data) >= 1
        
        # Check user structure
        user = data[0]
        assert "user_id" in user
        assert "email" in user
        assert "name" in user
        assert "role" in user
        # Password hash should not be returned
        assert "password_hash" not in user
    
    def test_create_and_login_new_user(self, admin_session):
        """Test creating a new user and logging in with them"""
        test_email = f"{TEST_USER_PREFIX}logintest_{uuid.uuid4().hex[:8]}@test.de"
        test_password = "TestUserPass123!"
        
        # Create user
        create_response = admin_session.post(
            f"{BASE_URL}/api/users",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Login Test User",
                "role": "editor"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["user_id"]
        
        # Login with new user
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": test_password,
                "stay_logged_in": False
            }
        )
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert data["email"] == test_email.lower()
        assert data["role"] == "editor"
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/users/{user_id}")


class TestEndToEndSearchWorkflow:
    """End-to-end test for search workflow"""
    
    def test_create_article_then_search(self, admin_session):
        """Test creating an article and finding it via search"""
        unique_term = f"UniqueSearchTerm{uuid.uuid4().hex[:6]}"
        
        # Create article with unique term
        create_response = admin_session.post(
            f"{BASE_URL}/api/articles",
            json={
                "title": f"{TEST_USER_PREFIX}Article with {unique_term}",
                "content": f"This article contains the unique term {unique_term} for testing.",
                "summary": f"Test article about {unique_term}",
                "status": "published"
            }
        )
        assert create_response.status_code == 200
        article_id = create_response.json()["article_id"]
        
        # Search for the unique term
        search_response = admin_session.post(
            f"{BASE_URL}/api/search",
            json={"query": unique_term, "top_k": 10}
        )
        
        assert search_response.status_code == 200
        data = search_response.json()
        
        # Should find our article
        assert len(data["results"]) >= 1
        found_article = next((r for r in data["results"] if r["article_id"] == article_id), None)
        assert found_article is not None, f"Should find article with id {article_id}"
        assert unique_term in found_article["title"]
        
        # Also test quick search
        quick_response = admin_session.get(
            f"{BASE_URL}/api/search/quick",
            params={"q": unique_term, "limit": 5}
        )
        assert quick_response.status_code == 200
        quick_data = quick_response.json()
        assert len(quick_data["results"]) >= 1
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/articles/{article_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
