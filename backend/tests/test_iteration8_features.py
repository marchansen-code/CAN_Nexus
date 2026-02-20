"""
Iteration 8: Test new features
1. Image Upload endpoint (POST /api/images/upload)
2. Image Retrieval endpoint (GET /api/images/{image_id})
3. Session Extension endpoint (POST /api/auth/extend-session)
"""
import pytest
import requests
import os
import base64
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token created via MongoDB
TEST_SESSION_TOKEN = None
TEST_USER_ID = None

@pytest.fixture(scope="module", autouse=True)
def setup_test_user():
    """Create test user and session for tests"""
    global TEST_SESSION_TOKEN, TEST_USER_ID
    import subprocess
    import json
    
    timestamp = int(datetime.now().timestamp() * 1000)
    user_id = f"test-iter8-pytest-{timestamp}"
    session_token = f"test_session_iter8_pytest_{timestamp}"
    
    # Create user and session via mongosh
    mongosh_script = f"""
    use('test_database');
    db.users.insertOne({{
      user_id: '{user_id}',
      email: 'pytest.iter8.{timestamp}@canusa.de',
      name: 'PyTest User Iter8',
      picture: 'https://via.placeholder.com/150',
      role: 'editor',
      is_blocked: false,
      recently_viewed: [],
      created_at: new Date()
    }});
    db.user_sessions.insertOne({{
      user_id: '{user_id}',
      session_token: '{session_token}',
      expires_at: new Date(Date.now() + 7*24*60*60*1000),
      created_at: new Date()
    }});
    print('OK');
    """
    
    result = subprocess.run(
        ['mongosh', '--quiet', '--eval', mongosh_script],
        capture_output=True,
        text=True
    )
    
    if 'OK' in result.stdout:
        TEST_SESSION_TOKEN = session_token
        TEST_USER_ID = user_id
    else:
        pytest.skip(f"Failed to create test user: {result.stderr}")
    
    yield
    
    # Cleanup
    cleanup_script = f"""
    use('test_database');
    db.users.deleteOne({{ user_id: '{user_id}' }});
    db.user_sessions.deleteMany({{ user_id: '{user_id}' }});
    db.images.deleteMany({{ uploaded_by: '{user_id}' }});
    """
    subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)


@pytest.fixture
def auth_headers():
    """Return auth headers with test session token"""
    return {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}


class TestImageUpload:
    """Tests for Image Upload feature (P0 Bug Fix)"""
    
    def test_image_upload_png(self, auth_headers):
        """Test uploading a PNG image"""
        # 1x1 transparent PNG
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        
        files = {'file': ('test.png', png_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "image_id" in data, "Response should contain image_id"
        assert data["image_id"].startswith("img_"), "image_id should start with 'img_'"
        assert "url" in data, "Response should contain url"
        assert data["url"] == f"/api/images/{data['image_id']}", "URL should be correct format"
        assert data.get("filename") == "test.png", "Filename should be preserved"
        
        return data["image_id"]
    
    def test_image_upload_jpeg(self, auth_headers):
        """Test uploading a JPEG image"""
        # Minimal valid JPEG (1x1 red pixel)
        jpeg_data = base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=')
        
        files = {'file': ('test.jpg', jpeg_data, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "image_id" in data
    
    def test_image_upload_invalid_type(self, auth_headers):
        """Test uploading invalid file type returns 400"""
        files = {'file': ('test.txt', b'This is a text file', 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "Nur Bilder" in data["detail"] or "image" in data["detail"].lower()
    
    def test_image_upload_requires_auth(self):
        """Test image upload requires authentication"""
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        
        files = {'file': ('test.png', png_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/images/upload",
            files=files  # No auth header
        )
        
        assert response.status_code == 401


class TestImageRetrieval:
    """Tests for Image Retrieval feature"""
    
    def test_get_uploaded_image(self, auth_headers):
        """Test retrieving an uploaded image"""
        # First upload an image
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        files = {'file': ('retrieval_test.png', png_data, 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        assert upload_response.status_code == 200
        image_id = upload_response.json()["image_id"]
        
        # Now retrieve it (public endpoint)
        get_response = requests.get(f"{BASE_URL}/api/images/{image_id}")
        
        assert get_response.status_code == 200
        assert get_response.headers.get("Content-Type") == "image/png"
        assert len(get_response.content) > 0
    
    def test_get_nonexistent_image(self):
        """Test 404 for non-existent image"""
        response = requests.get(f"{BASE_URL}/api/images/nonexistent_image_id")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        # German error message
        assert "nicht gefunden" in data["detail"] or "not found" in data["detail"].lower()
    
    def test_get_image_no_auth_required(self, auth_headers):
        """Test image retrieval is public (no auth required for viewing)"""
        # Upload with auth
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        files = {'file': ('public_test.png', png_data, 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        image_id = upload_response.json()["image_id"]
        
        # Get without auth
        get_response = requests.get(f"{BASE_URL}/api/images/{image_id}")
        assert get_response.status_code == 200


class TestSessionExtension:
    """Tests for Session Extension feature (P1 Feature - 'Angemeldet bleiben')"""
    
    def test_extend_session_true(self, auth_headers):
        """Test extending session to 30 days"""
        response = requests.post(
            f"{BASE_URL}/api/auth/extend-session",
            headers=auth_headers,
            json={"extend": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "30" in data["message"], "Message should mention 30 days"
        assert "expires_at" in data
        
        # Verify expiry is roughly 30 days in future
        expires = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.now(expires.tzinfo)
        delta = expires - now
        assert 29 <= delta.days <= 31, f"Expected ~30 days, got {delta.days}"
    
    def test_extend_session_false(self, auth_headers):
        """Test resetting session to 7 days"""
        response = requests.post(
            f"{BASE_URL}/api/auth/extend-session",
            headers=auth_headers,
            json={"extend": False}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "7" in data["message"], "Message should mention 7 days"
        assert "expires_at" in data
        
        # Verify expiry is roughly 7 days in future
        expires = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.now(expires.tzinfo)
        delta = expires - now
        assert 6 <= delta.days <= 8, f"Expected ~7 days, got {delta.days}"
    
    def test_extend_session_requires_auth(self):
        """Test session extension requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/extend-session",
            json={"extend": True}
        )
        
        assert response.status_code == 401
    
    def test_extend_session_invalid_body(self, auth_headers):
        """Test invalid request body returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/auth/extend-session",
            headers=auth_headers,
            json={}  # Missing extend field
        )
        
        assert response.status_code == 422  # Validation error


class TestEditorImageIntegration:
    """Tests verifying image upload integration with article editor"""
    
    def test_full_image_workflow(self, auth_headers):
        """Test complete image workflow: upload -> use in article"""
        # 1. Upload image
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        files = {'file': ('article_image.png', png_data, 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/images/upload",
            headers=auth_headers,
            files=files
        )
        assert upload_response.status_code == 200
        image_id = upload_response.json()["image_id"]
        image_url = f"/api/images/{image_id}"
        
        # 2. Create article with image in content
        article_response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}", "Content-Type": "application/json"},
            json={
                "title": "TEST_Article with Image",
                "content": f'<p>Test content</p><img src="{BASE_URL}{image_url}" alt="test"/>',
                "status": "draft"
            }
        )
        assert article_response.status_code == 200
        article_id = article_response.json()["article_id"]
        
        # 3. Verify article contains image URL
        get_response = requests.get(
            f"{BASE_URL}/api/articles/{article_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        assert image_url in get_response.json()["content"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
