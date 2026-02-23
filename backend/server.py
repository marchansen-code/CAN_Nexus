from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pdfplumber
import asyncio
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Default admin credentials
DEFAULT_ADMIN_EMAIL = "marc.hansen@canusa.de"
DEFAULT_ADMIN_PASSWORD = "CanusaNexus2024!"
DEFAULT_ADMIN_NAME = "Marc Hansen"

# Active editors tracking (in-memory, for production use Redis)
active_editors = {}

# Create the main app
app = FastAPI(title="CANUSA Knowledge Hub API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = "viewer"
    is_blocked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0

class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    article_id: str = Field(default_factory=lambda: f"art_{uuid.uuid4().hex[:12]}")
    title: str
    content: str
    summary: Optional[str] = None
    category_id: Optional[str] = None
    status: str = "draft"
    visibility: str = "all"
    tags: List[str] = []
    source_document_id: Optional[str] = None
    review_date: Optional[datetime] = None
    favorited_by: List[str] = []
    contact_person_id: Optional[str] = None
    created_by: str
    updated_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    view_count: int = 0

class ArticleCreate(BaseModel):
    title: str
    content: str
    summary: Optional[str] = None
    category_id: Optional[str] = None
    status: str = "draft"
    visibility: str = "all"
    tags: List[str] = []
    contact_person_id: Optional[str] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    category_id: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[List[str]] = None
    review_date: Optional[datetime] = None
    contact_person_id: Optional[str] = None

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    filename: str
    original_language: Optional[str] = None
    target_language: str = "de"
    status: str = "pending"
    page_count: int = 0
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    structured_content: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class SearchResult(BaseModel):
    article_id: str
    title: str
    content_snippet: str
    score: float
    category_name: Optional[str] = None

# ==================== AUTH HELPERS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(request: Request) -> User:
    """Get user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Sitzung nicht gefunden")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sitzung abgelaufen")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
    
    if user.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="Ihr Konto wurde gesperrt. Bitte kontaktieren Sie einen Administrator.")
    
    return User(**user)

async def get_optional_user(request: Request) -> Optional[User]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== AUTH ENDPOINTS ====================

class LoginRequest(BaseModel):
    email: str
    password: str
    stay_logged_in: bool = False

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "viewer"

class PasswordChange(BaseModel):
    new_password: str

@api_router.post("/auth/login")
async def login(login_data: LoginRequest, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": login_data.email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")
    
    if not verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")
    
    if user.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="Ihr Konto wurde gesperrt")
    
    # Create session
    session_token = str(uuid.uuid4())
    days = 30 if login_data.stay_logged_in else 7
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=days * 24 * 60 * 60
    )
    
    # Return user without password hash
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "is_blocked": user.get("is_blocked", False)
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Erfolgreich abgemeldet"}

# ==================== USER MANAGEMENT ENDPOINTS ====================

class RoleUpdate(BaseModel):
    role: str

@api_router.get("/users", response_model=List[Dict])
async def get_users(user: User = Depends(get_current_user)):
    """Get all users"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users

@api_router.get("/users/{user_id}", response_model=Dict)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user

@api_router.post("/users")
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create a new user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer anlegen")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail-Adresse bereits registriert")
    
    # Validate role
    if user_data.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "is_blocked": False,
        "recently_viewed": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    return {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "role": user_data.role,
        "message": "Benutzer erfolgreich angelegt"
    }

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role_update: RoleUpdate, current_user: User = Depends(get_current_user)):
    """Update a user's role (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Rollen ändern")
    
    if role_update.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können Ihre eigene Rolle nicht ändern")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role_update.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    return {"message": f"Rolle auf {role_update.role} geändert"}

@api_router.put("/users/{user_id}/password")
async def change_user_password(user_id: str, password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change a user's password (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Passwörter ändern")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen lang sein")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "password_hash": get_password_hash(password_data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    # Invalidate all sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"message": "Passwort erfolgreich geändert"}

@api_router.put("/users/{user_id}/block")
async def toggle_user_block(user_id: str, current_user: User = Depends(get_current_user)):
    """Block or unblock a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer sperren")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst sperren")
    
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    new_status = not user_doc.get("is_blocked", False)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_blocked": new_status}}
    )
    
    if new_status:
        await db.user_sessions.delete_many({"user_id": user_id})
    
    return {
        "message": f"Benutzer {'gesperrt' if new_status else 'entsperrt'}",
        "is_blocked": new_status
    }

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user permanently (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer löschen")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
    
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": "Benutzer gelöscht"}

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories", response_model=List[Dict])
async def get_categories(user: User = Depends(get_current_user)):
    """Get all categories as a tree structure"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Dict)
async def create_category(category: CategoryCreate, user: User = Depends(get_current_user)):
    """Create a new category"""
    cat_doc = Category(
        name=category.name,
        parent_id=category.parent_id,
        description=category.description,
        order=category.order,
        created_by=user.user_id
    )
    doc = cat_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/categories/{category_id}", response_model=Dict)
async def update_category(category_id: str, update: CategoryCreate, user: User = Depends(get_current_user)):
    """Update a category"""
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {
            "name": update.name,
            "parent_id": update.parent_id,
            "description": update.description,
            "order": update.order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    
    cat = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return cat

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(get_current_user)):
    """Delete a category"""
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Kategorie gelöscht"}

# ==================== ARTICLE ENDPOINTS ====================

@api_router.get("/articles", response_model=List[Dict])
async def get_articles(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all articles with optional filtering"""
    query = {}
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    
    articles = await db.articles.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return articles

@api_router.get("/articles/top-viewed")
async def get_top_viewed_articles(limit: int = 10, user: User = Depends(get_current_user)):
    """Get top viewed articles system-wide"""
    articles = await db.articles.find({}, {"_id": 0}).sort("view_count", -1).limit(limit).to_list(limit)
    return articles

@api_router.get("/articles/by-category/{category_id}")
async def get_articles_by_category(category_id: str, user: User = Depends(get_current_user)):
    """Get articles in a specific category"""
    articles = await db.articles.find(
        {"category_id": category_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return articles

@api_router.get("/articles/{article_id}", response_model=Dict)
async def get_article(article_id: str, user: User = Depends(get_current_user)):
    """Get a single article"""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return article

@api_router.post("/articles", response_model=Dict)
async def create_article(article: ArticleCreate, user: User = Depends(get_current_user)):
    """Create a new article"""
    art_doc = Article(
        title=article.title,
        content=article.content,
        summary=article.summary,
        category_id=article.category_id,
        status=article.status,
        visibility=article.visibility,
        tags=article.tags,
        created_by=user.user_id,
        updated_by=user.user_id
    )
    doc = art_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if doc.get("review_date"):
        doc["review_date"] = doc["review_date"].isoformat()
    
    await db.articles.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/articles/{article_id}", response_model=Dict)
async def update_article(article_id: str, update: ArticleUpdate, user: User = Depends(get_current_user)):
    """Update an article"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_by"] = user.user_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data.get("review_date"):
        update_data["review_date"] = update_data["review_date"].isoformat()
    
    result = await db.articles.update_one(
        {"article_id": article_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    return article

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user: User = Depends(get_current_user)):
    """Delete an article"""
    result = await db.articles.delete_one({"article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return {"message": "Artikel gelöscht"}

# ==================== SEARCH ====================

class SearchQuery(BaseModel):
    query: str
    top_k: int = 10
    category_id: Optional[str] = None

@api_router.post("/search")
async def search_articles(query: SearchQuery, user: User = Depends(get_current_user)):
    """Search articles with keyword matching"""
    if not query.query or len(query.query) < 2:
        return {"results": [], "query": query.query}
    
    # Build MongoDB query for text search
    search_terms = query.query.lower().split()
    
    # Search in title, content, summary, and tags
    or_conditions = []
    for term in search_terms:
        or_conditions.extend([
            {"title": {"$regex": term, "$options": "i"}},
            {"content": {"$regex": term, "$options": "i"}},
            {"summary": {"$regex": term, "$options": "i"}},
            {"tags": {"$regex": term, "$options": "i"}}
        ])
    
    mongo_query = {"$or": or_conditions}
    
    if query.category_id:
        mongo_query["category_id"] = query.category_id
    
    articles = await db.articles.find(mongo_query, {"_id": 0}).limit(query.top_k * 2).to_list(query.top_k * 2)
    
    # Score and rank results
    results = []
    for art in articles:
        title_lower = art["title"].lower()
        content_lower = art.get("content", "").lower()
        summary_lower = art.get("summary", "").lower()
        
        # Calculate relevance score
        score = 0
        for term in search_terms:
            if term in title_lower:
                score += 0.4  # Title matches are most important
            if term in summary_lower:
                score += 0.2
            if term in content_lower:
                score += 0.1
        
        if score == 0:
            continue
        
        # Find snippet
        snippet = art.get("summary", "")
        if not snippet:
            content = art.get("content", "")
            # Strip HTML tags for snippet
            import re
            clean_content = re.sub(r'<[^>]+>', '', content)
            for term in search_terms:
                idx = clean_content.lower().find(term)
                if idx >= 0:
                    start = max(0, idx - 50)
                    end = min(len(clean_content), idx + 150)
                    snippet = "..." + clean_content[start:end].strip() + "..."
                    break
            if not snippet:
                snippet = clean_content[:200] + "..." if len(clean_content) > 200 else clean_content
        
        # Get category name
        category_name = None
        if art.get("category_id"):
            cat = await db.categories.find_one({"category_id": art["category_id"]}, {"_id": 0, "name": 1})
            if cat:
                category_name = cat["name"]
        
        results.append({
            "article_id": art["article_id"],
            "title": art["title"],
            "content_snippet": snippet[:300],
            "score": min(score, 1.0),
            "category_name": category_name,
            "status": art.get("status", "draft"),
            "updated_at": art.get("updated_at")
        })
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return {"results": results[:query.top_k], "query": query.query}

@api_router.get("/search/quick")
async def quick_search(q: str, limit: int = 5, user: User = Depends(get_current_user)):
    """Quick search for autocomplete - fast, lightweight results"""
    if not q or len(q) < 2:
        return {"results": []}
    
    # Simple regex search on title and summary only for speed
    articles = await db.articles.find(
        {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "article_id": 1, "title": 1, "summary": 1, "status": 1, "category_id": 1}
    ).limit(limit).to_list(limit)
    
    results = []
    for art in articles:
        # Get category name
        category_name = None
        if art.get("category_id"):
            cat = await db.categories.find_one({"category_id": art["category_id"]}, {"_id": 0, "name": 1})
            if cat:
                category_name = cat["name"]
        
        results.append({
            "article_id": art["article_id"],
            "title": art["title"],
            "summary": (art.get("summary") or "")[:100],
            "status": art.get("status", "draft"),
            "category_name": category_name
        })
    
    return {"results": results}

# ==================== DOCUMENT UPLOAD & PROCESSING ====================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    target_language: str = "de",
    force: bool = False,
    user: User = Depends(get_current_user)
):
    """Upload a PDF document for processing"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Nur PDF-Dateien sind erlaubt")
    
    existing_doc = await db.documents.find_one({"filename": file.filename})
    if existing_doc and not force:
        raise HTTPException(
            status_code=409, 
            detail=f"Eine Datei mit dem Namen '{file.filename}' existiert bereits."
        )
    
    if existing_doc and force:
        old_path = existing_doc.get("file_path")
        if old_path and os.path.exists(old_path):
            os.remove(old_path)
        await db.documents.delete_one({"document_id": existing_doc["document_id"]})
    
    content = await file.read()
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    permanent_path = f"/tmp/pdfs/{doc_id}.pdf"
    
    os.makedirs("/tmp/pdfs", exist_ok=True)
    
    with open(permanent_path, "wb") as f:
        f.write(content)
    
    doc = Document(
        document_id=doc_id,
        filename=file.filename,
        target_language=target_language,
        status="pending",
        uploaded_by=user.user_id
    )
    doc_dict = doc.model_dump()
    doc_dict["created_at"] = doc_dict["created_at"].isoformat()
    doc_dict["file_path"] = permanent_path
    doc_dict["file_size"] = len(content)
    
    await db.documents.insert_one(doc_dict)
    
    asyncio.create_task(process_document(doc_id, permanent_path, target_language))
    
    return {
        "document_id": doc_id,
        "filename": doc.filename,
        "status": "pending",
        "message": "Dokument wird verarbeitet"
    }

async def process_document(document_id: str, file_path: str, target_language: str):
    """Process PDF document: extract text and tables"""
    try:
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "processing"}}
        )
        
        extracted_text = ""
        html_content = ""
        page_count = 0
        extracted_tables = []
        
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for page_num, page in enumerate(pdf.pages, 1):
                html_content += f"<div class='pdf-page' data-page='{page_num}'>"
                
                text = page.extract_text()
                if text:
                    extracted_text += f"--- Seite {page_num} ---\n{text}\n\n"
                    paragraphs = text.split('\n\n')
                    for para in paragraphs:
                        if para.strip():
                            if len(para.strip()) < 100 and para.strip().isupper():
                                html_content += f"<h3>{para.strip()}</h3>"
                            else:
                                html_content += f"<p>{para.strip()}</p>"
                
                tables = page.extract_tables()
                for table_idx, table in enumerate(tables):
                    if table and len(table) > 0:
                        table_html = "<table class='w-full border-collapse my-4 text-sm'>"
                        for row_idx, row in enumerate(table):
                            if row:
                                table_html += "<tr>"
                                for cell in row:
                                    cell_content = cell if cell else ""
                                    if row_idx == 0:
                                        table_html += f"<th class='border border-slate-400 bg-slate-100 p-2 font-semibold text-left'>{cell_content}</th>"
                                    else:
                                        table_html += f"<td class='border border-slate-300 p-2'>{cell_content}</td>"
                                table_html += "</tr>"
                        table_html += "</table>"
                        extracted_tables.append({
                            "page": page_num,
                            "index": table_idx,
                            "html": table_html
                        })
                        html_content += table_html
                
                html_content += "</div>"
        
        if not extracted_text.strip():
            raise Exception("Kein Text konnte aus dem PDF extrahiert werden")
        
        structured_content = {
            "headlines": [],
            "bulletpoints": [],
            "tables": extracted_tables,
            "images": [],
            "html_content": html_content
        }
        
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": "completed",
                "page_count": page_count,
                "extracted_text": extracted_text,
                "structured_content": structured_content,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Document {document_id} processed successfully")
        
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": "failed",
                "error_message": str(e)
            }}
        )

@api_router.get("/documents", response_model=List[Dict])
async def get_documents(user: User = Depends(get_current_user)):
    """Get all documents"""
    docs = await db.documents.find({}, {"_id": 0, "temp_path": 0}).sort("created_at", -1).to_list(100)
    return docs

@api_router.get("/documents/{document_id}", response_model=Dict)
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    """Get document details"""
    doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0, "temp_path": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return doc

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: User = Depends(get_current_user)):
    """Delete a document (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Dokumente löschen")
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    file_path = doc.get("file_path") or doc.get("temp_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    
    await db.documents.delete_one({"document_id": document_id})
    return {"message": "Dokument gelöscht"}

@api_router.get("/documents/{document_id}/pdf-embed")
async def get_document_pdf_embed(document_id: str, token: str = None):
    """Get PDF file for iframe embedding"""
    from fastapi.responses import Response
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF-Datei nicht gefunden")
    
    with open(file_path, "rb") as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=3600",
            "X-Frame-Options": "SAMEORIGIN"
        }
    )

# ==================== IMAGE UPLOAD ====================

@api_router.post("/images/upload")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload an image for use in articles"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nur Bilder sind erlaubt (JPEG, PNG, GIF, WebP)")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bild darf maximal 10MB groß sein")
    
    images_dir = "/tmp/images"
    os.makedirs(images_dir, exist_ok=True)
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    filename = f"{image_id}.{ext}"
    file_path = f"{images_dir}/{filename}"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    image_doc = {
        "image_id": image_id,
        "filename": filename,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "file_path": file_path,
        "uploaded_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.images.insert_one(image_doc)
    
    return {
        "image_id": image_id,
        "url": f"/api/images/{image_id}",
        "filename": file.filename
    }

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Serve an uploaded image"""
    from fastapi.responses import Response
    
    image_doc = await db.images.find_one({"image_id": image_id})
    if not image_doc:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    
    file_path = image_doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Bilddatei nicht gefunden")
    
    with open(file_path, "rb") as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type=image_doc.get("content_type", "image/jpeg"),
        headers={
            "Cache-Control": "public, max-age=31536000",
            "Content-Disposition": f"inline; filename=\"{image_doc.get('original_filename', 'image')}\""
        }
    )

# ==================== STATISTICS ====================

@api_router.get("/stats")
async def get_stats(user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_articles = await db.articles.count_documents({})
    published_articles = await db.articles.count_documents({"status": "published"})
    draft_articles = await db.articles.count_documents({"status": "draft"})
    review_articles = await db.articles.count_documents({"status": "review"})
    total_categories = await db.categories.count_documents({})
    total_documents = await db.documents.count_documents({})
    pending_documents = await db.documents.count_documents({"status": "pending"})
    
    recent_articles = await db.articles.find({}, {"_id": 0}).sort("updated_at", -1).limit(5).to_list(5)
    top_articles = await db.articles.find({}, {"_id": 0}).sort("view_count", -1).limit(5).to_list(5)
    
    favorite_articles = await db.articles.find(
        {"favorited_by": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "recently_viewed": 1})
    recently_viewed_ids = user_data.get("recently_viewed", [])[:15] if user_data else []
    recently_viewed = []
    if recently_viewed_ids:
        for article_id in recently_viewed_ids:
            article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
            if article:
                recently_viewed.append(article)
    
    user_articles_count = await db.articles.count_documents({"created_by": user.user_id})
    user_documents_count = await db.documents.count_documents({"uploaded_by": user.user_id})
    
    return {
        "total_articles": total_articles,
        "published_articles": published_articles,
        "draft_articles": draft_articles,
        "review_articles": review_articles,
        "total_categories": total_categories,
        "total_documents": total_documents,
        "pending_documents": pending_documents,
        "recent_articles": recent_articles,
        "top_articles": top_articles,
        "favorite_articles": favorite_articles,
        "recently_viewed": recently_viewed,
        "user_stats": {
            "articles_created": user_articles_count,
            "documents_uploaded": user_documents_count
        }
    }

# ==================== FAVORITES ====================

@api_router.post("/articles/{article_id}/favorite")
async def toggle_favorite(article_id: str, user: User = Depends(get_current_user)):
    """Toggle favorite status for an article"""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    favorited_by = article.get("favorited_by", [])
    
    if user.user_id in favorited_by:
        await db.articles.update_one(
            {"article_id": article_id},
            {"$pull": {"favorited_by": user.user_id}}
        )
        return {"favorited": False, "message": "Aus Favoriten entfernt"}
    else:
        await db.articles.update_one(
            {"article_id": article_id},
            {"$addToSet": {"favorited_by": user.user_id}}
        )
        return {"favorited": True, "message": "Zu Favoriten hinzugefügt"}

@api_router.get("/favorites")
async def get_favorites(user: User = Depends(get_current_user)):
    """Get all favorite articles for current user"""
    articles = await db.articles.find(
        {"favorited_by": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return articles

# ==================== RECENTLY VIEWED ====================

@api_router.post("/articles/{article_id}/viewed")
async def mark_as_viewed(article_id: str, user: User = Depends(get_current_user)):
    """Mark article as viewed and update recently viewed list"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$pull": {"recently_viewed": article_id}}
    )
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$push": {"recently_viewed": {"$each": [article_id], "$position": 0, "$slice": 20}}}
    )
    await db.articles.update_one(
        {"article_id": article_id},
        {"$inc": {"view_count": 1}}
    )
    return {"message": "Als angesehen markiert"}

# ==================== PRESENCE / ACTIVE EDITORS ====================

@api_router.post("/articles/{article_id}/presence")
async def update_presence(article_id: str, user: User = Depends(get_current_user)):
    """Update editor presence for an article"""
    global active_editors
    
    if article_id not in active_editors:
        active_editors[article_id] = {}
    
    active_editors[article_id][user.user_id] = {
        "name": user.name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=30)
    for uid in list(active_editors[article_id].keys()):
        ts = datetime.fromisoformat(active_editors[article_id][uid]["timestamp"])
        if ts < cutoff:
            del active_editors[article_id][uid]
    
    others = {uid: info for uid, info in active_editors[article_id].items() if uid != user.user_id}
    
    return {"active_editors": list(others.values())}

@api_router.delete("/articles/{article_id}/presence")
async def remove_presence(article_id: str, user: User = Depends(get_current_user)):
    """Remove editor presence when leaving article"""
    global active_editors
    
    if article_id in active_editors and user.user_id in active_editors[article_id]:
        del active_editors[article_id][user.user_id]
    
    return {"message": "Präsenz entfernt"}

# ==================== WIDGET API ====================

@api_router.get("/widget/search")
async def widget_search(q: str, limit: int = 3):
    """Public widget search endpoint"""
    articles = await db.articles.find(
        {
            "status": "published",
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0, "article_id": 1, "title": 1, "summary": 1}
    ).limit(limit).to_list(limit)
    
    return {"results": articles, "query": q}

@api_router.get("/widget/article/{article_id}")
async def widget_get_article(article_id: str):
    """Public widget article endpoint"""
    article = await db.articles.find_one(
        {"article_id": article_id, "status": "published"},
        {"_id": 0, "article_id": 1, "title": 1, "content": 1, "summary": 1}
    )
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return article

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "CANUSA Knowledge Hub API", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    """Initialize database and create default admin"""
    # Create indexes
    await db.articles.create_index([("title", "text"), ("content", "text")])
    await db.articles.create_index("status")
    await db.articles.create_index("category_id")
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    
    # Check for existing admin user
    admin_exists = await db.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    
    if admin_exists:
        # Check if user has password_hash (migration from Google Auth)
        if not admin_exists.get("password_hash"):
            logger.info(f"Migrating admin user {DEFAULT_ADMIN_EMAIL} to password auth...")
            await db.users.update_one(
                {"email": DEFAULT_ADMIN_EMAIL},
                {"$set": {
                    "password_hash": get_password_hash(DEFAULT_ADMIN_PASSWORD),
                    "role": "admin",
                    "is_blocked": False
                }}
            )
            logger.info(f"Admin user migrated successfully")
    else:
        # Create new admin user
        admin_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": DEFAULT_ADMIN_EMAIL,
            "name": DEFAULT_ADMIN_NAME,
            "password_hash": get_password_hash(DEFAULT_ADMIN_PASSWORD),
            "role": "admin",
            "is_blocked": False,
            "recently_viewed": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Default admin user created: {DEFAULT_ADMIN_EMAIL}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
