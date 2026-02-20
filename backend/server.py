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
import httpx
import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Pinecone initialization
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
INDEX_NAME = "knowledge-nexus"

# Allowed email domains
ALLOWED_DOMAINS = ["canusa.de", "cu-travel.com"]

# Active editors tracking (in-memory, for production use Redis)
active_editors = {}  # {article_id: {user_id: {name, timestamp}}}

pc = None
pinecone_index = None

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
    picture: Optional[str] = None
    role: str = "editor"
    is_blocked: bool = False  # Sperrfunktion für Admins
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
    status: str = "draft"  # draft, review, published
    visibility: str = "all"  # all, editors, admins
    tags: List[str] = []
    source_document_id: Optional[str] = None
    review_date: Optional[datetime] = None
    favorited_by: List[str] = []
    contact_person_id: Optional[str] = None  # Ansprechpartner User ID
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
    status: str = "pending"  # pending, processing, completed, failed
    page_count: int = 0
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    structured_content: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class SearchQuery(BaseModel):
    query: str
    top_k: int = 5
    category_id: Optional[str] = None

class SearchResult(BaseModel):
    article_id: str
    title: str
    content_snippet: str
    score: float
    category_name: Optional[str] = None

class AIAnswer(BaseModel):
    answer: str
    sources: List[SearchResult]
    query: str

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is blocked
    if user.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="Your account has been blocked. Please contact an administrator.")
    
    return User(**user)

async def get_optional_user(request: Request) -> Optional[User]:
    """Get user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Get session data from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    auth_data = auth_response.json()
    
    # Check if email domain is allowed
    email = auth_data.get("email", "")
    email_domain = email.split("@")[-1] if "@" in email else ""
    if email_domain not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=403, 
            detail="Zugang nur für Mitarbeiter von CANUSA und CU-Travel. Bitte verwenden Sie Ihre @canusa.de oder @cu-travel.com E-Mail-Adresse."
        )
    
    # Create or update user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "viewer",  # New users start as viewer until admin changes role
            "recently_viewed": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = auth_data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
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
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

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
    return {"message": "Logged out successfully"}

# ==================== USER MANAGEMENT ENDPOINTS ====================

class RoleUpdate(BaseModel):
    role: str

@api_router.get("/users", response_model=List[Dict])
async def get_users(user: User = Depends(get_current_user)):
    """Get all users"""
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return users

@api_router.get("/users/{user_id}", response_model=Dict)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a user's role (admin only)"""
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change user roles")
    
    # Validate role
    if role_update.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be admin, editor, or viewer")
    
    # Prevent self-demotion
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role_update.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {role_update.role}"}

@api_router.put("/users/{user_id}/block")
async def toggle_user_block(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Block or unblock a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can block users")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Get current block status
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user_doc.get("is_blocked", False)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_blocked": new_status}}
    )
    
    # Delete active sessions if blocking
    if new_status:
        await db.sessions.delete_many({"user_id": user_id})
    
    return {
        "message": f"User {'blocked' if new_status else 'unblocked'}",
        "is_blocked": new_status
    }

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories", response_model=List[Dict])
async def get_categories(user: User = Depends(get_current_user)):
    """Get all categories as a tree structure"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Dict)
async def create_category(
    category: CategoryCreate,
    user: User = Depends(get_current_user)
):
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
async def update_category(
    category_id: str,
    update: CategoryCreate,
    user: User = Depends(get_current_user)
):
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
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return cat

@api_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a category"""
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

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
    articles = await db.articles.find(
        {},
        {"_id": 0}
    ).sort("view_count", -1).limit(limit).to_list(limit)
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
async def get_article(
    article_id: str,
    user: User = Depends(get_current_user)
):
    """Get a single article"""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@api_router.post("/articles", response_model=Dict)
async def create_article(
    article: ArticleCreate,
    user: User = Depends(get_current_user)
):
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
    
    # Index in Pinecone if published
    if article.status == "published" and pinecone_index:
        await index_article_in_pinecone(art_doc.article_id, article.title, article.content)
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.post("/articles/generate-summary")
async def generate_summary(
    request: Request,
    user: User = Depends(get_current_user)
):
    """Generate a summary from article content using AI"""
    body = await request.json()
    content = body.get("content", "")
    
    if not content or len(content) < 50:
        return {"summary": ""}
    
    # Strip HTML tags for summary generation
    import re
    clean_content = re.sub(r'<[^>]+>', '', content)
    clean_content = clean_content[:4000]  # Limit content length
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"summary_{uuid.uuid4().hex[:8]}",
            system_message="Du bist ein Experte für das Erstellen von Zusammenfassungen. Antworte immer auf Deutsch."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        summary_prompt = f"""Erstelle eine kurze, prägnante Zusammenfassung (max. 2-3 Sätze) für den folgenden Artikel-Inhalt. Die Zusammenfassung soll den Kerninhalt des Artikels erfassen:

{clean_content}

Zusammenfassung:"""
        
        summary_message = UserMessage(text=summary_prompt)
        summary = await chat.send_message(summary_message)
        
        # Clean up the summary
        summary = summary.strip()
        if summary.startswith("Zusammenfassung:"):
            summary = summary[16:].strip()
        
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return {"summary": ""}

@api_router.put("/articles/{article_id}", response_model=Dict)
async def update_article(
    article_id: str,
    update: ArticleUpdate,
    user: User = Depends(get_current_user)
):
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
        raise HTTPException(status_code=404, detail="Article not found")
    
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    
    # Re-index in Pinecone if published
    if article.get("status") == "published" and pinecone_index:
        await index_article_in_pinecone(article_id, article["title"], article["content"])
    
    return article

@api_router.delete("/articles/{article_id}")
async def delete_article(
    article_id: str,
    user: User = Depends(get_current_user)
):
    """Delete an article"""
    result = await db.articles.delete_one({"article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Remove from Pinecone
    if pinecone_index:
        try:
            pinecone_index.delete(ids=[article_id], namespace="articles")
        except Exception as e:
            logger.warning(f"Failed to delete from Pinecone: {e}")
    
    return {"message": "Article deleted"}

# ==================== DOCUMENT UPLOAD & PROCESSING ====================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    target_language: str = "de",
    user: User = Depends(get_current_user)
):
    """Upload a PDF document for processing"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Save file permanently for embedding
    content = await file.read()
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    permanent_path = f"/tmp/pdfs/{doc_id}.pdf"
    
    # Create directory if needed
    import os
    os.makedirs("/tmp/pdfs", exist_ok=True)
    
    with open(permanent_path, "wb") as f:
        f.write(content)
    
    # Create document record
    doc = Document(
        document_id=doc_id,
        filename=file.filename,
        target_language=target_language,
        status="pending",
        uploaded_by=user.user_id
    )
    doc_dict = doc.model_dump()
    doc_dict["created_at"] = doc_dict["created_at"].isoformat()
    doc_dict["file_path"] = permanent_path  # Keep for embedding
    doc_dict["file_size"] = len(content)
    
    await db.documents.insert_one(doc_dict)
    
    # Start async processing
    asyncio.create_task(process_document(doc_id, permanent_path, target_language))
    
    return {
        "document_id": doc_id,
        "filename": doc.filename,
        "status": "pending",
        "message": "Document uploaded and processing started"
    }

async def process_document(document_id: str, file_path: str, target_language: str):
    """Process PDF document: extract text, images, tables - keep original layout"""
    try:
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "processing"}}
        )
        
        # Extract text, tables, and images from PDF
        extracted_text = ""
        html_content = ""  # HTML representation of PDF content
        page_count = 0
        extracted_tables = []
        extracted_images = []
        
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for page_num, page in enumerate(pdf.pages, 1):
                html_content += f"<div class='pdf-page' data-page='{page_num}'>"
                
                # Extract text with layout preservation
                text = page.extract_text()
                if text:
                    extracted_text += f"--- Seite {page_num} ---\n{text}\n\n"
                    # Convert paragraphs to HTML
                    paragraphs = text.split('\n\n')
                    for para in paragraphs:
                        if para.strip():
                            # Check if it looks like a heading (short, possibly uppercase)
                            if len(para.strip()) < 100 and para.strip().isupper():
                                html_content += f"<h3>{para.strip()}</h3>"
                            else:
                                html_content += f"<p>{para.strip()}</p>"
                
                # Extract tables with better formatting
                tables = page.extract_tables()
                for table_idx, table in enumerate(tables):
                    if table and len(table) > 0:
                        # Convert table to styled HTML
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
                            "html": table_html,
                            "rows": len(table),
                            "cols": len(table[0]) if table else 0
                        })
                        html_content += table_html
                
                html_content += "</div>"
        
        if not extracted_text.strip():
            raise Exception("No text could be extracted from PDF")
        
        # Detect language using simple heuristics
        german_words = ["und", "der", "die", "das", "ist", "für", "von", "mit", "auf", "ein"]
        english_words = ["and", "the", "is", "for", "of", "with", "on", "a", "an", "to"]
        text_lower = extracted_text.lower()
        german_count = sum(1 for w in german_words if f" {w} " in text_lower)
        english_count = sum(1 for w in english_words if f" {w} " in text_lower)
        original_language = "Deutsch" if german_count > english_count else "Englisch"
        
        # Translate if needed
        if target_language == "de" and original_language.lower() not in ["deutsch", "german", "de"]:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"doc_{document_id}",
                system_message="Du bist ein professioneller Übersetzer. Übersetze Texte präzise ins Deutsche."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            translate_prompt = f"""Übersetze den folgenden Text ins Deutsche. 
Behalte die Struktur und Formatierung bei. Übersetze nur den Text, keine HTML-Tags ändern.

{extracted_text[:6000]}"""
            
            translate_message = UserMessage(text=translate_prompt)
            translated_text = await chat.send_message(translate_message)
            extracted_text = translated_text
        
        structured_content = {
            "headlines": [],
            "bulletpoints": [],
            "tables": extracted_tables,
            "images": extracted_images,
            "html_content": html_content
        }
        
        # Update document - NO SUMMARY generated
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": "completed",
                "page_count": page_count,
                "original_language": original_language,
                "extracted_text": extracted_text,
                "summary": None,  # No auto-summary
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
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: User = Depends(get_current_user)):
    """Delete a document (admin only)"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete documents")
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete PDF file if exists
    file_path = doc.get("file_path") or doc.get("temp_path")
    if file_path:
        try:
            import os
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
    
    await db.documents.delete_one({"document_id": document_id})
    return {"message": "Document deleted"}

@api_router.get("/documents/{document_id}/pdf")
async def get_document_pdf(document_id: str, user: User = Depends(get_current_user)):
    """Get PDF file for embedding/viewing"""
    from fastapi.responses import FileResponse
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=doc.get("filename", "document.pdf")
    )

@api_router.post("/documents/{document_id}/create-article")
async def create_article_from_document(
    document_id: str,
    title: Optional[str] = None,
    category_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Create a knowledge article from processed document"""
    doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["status"] != "completed":
        raise HTTPException(status_code=400, detail="Document not yet processed")
    
    # Create article
    article_title = title or doc["filename"].replace(".pdf", "")
    content = f"""## Zusammenfassung

{doc.get('summary', '')}

## Hauptpunkte

"""
    for point in doc.get("structured_content", {}).get("bulletpoints", []):
        content += f"- {point}\n"
    
    content += f"""

## Vollständiger Inhalt

{doc.get('extracted_text', '')[:10000]}
"""
    
    article = ArticleCreate(
        title=article_title,
        content=content,
        summary=doc.get("summary"),
        category_id=category_id,
        status="draft"
    )
    
    return await create_article(article, user)

# ==================== SEARCH & RAG ====================

async def get_embedding(text: str) -> List[float]:
    """Get embedding for text using Gemini"""
    # For now, use a simple hash-based pseudo-embedding for demo
    # In production, use proper embedding model
    import hashlib
    hash_obj = hashlib.sha256(text.encode())
    hash_bytes = hash_obj.digest()
    # Convert to 1536-dimensional vector (OpenAI embedding dimension)
    embedding = []
    for i in range(1536):
        byte_idx = i % 32
        embedding.append((hash_bytes[byte_idx] / 255.0) * 2 - 1)
    return embedding

async def index_article_in_pinecone(article_id: str, title: str, content: str):
    """Index article content in Pinecone"""
    if not pinecone_index:
        return
    
    try:
        # Split content into chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        chunks = splitter.split_text(f"{title}\n\n{content}")
        
        # Create vectors for each chunk
        vectors = []
        for i, chunk in enumerate(chunks[:10]):  # Limit to 10 chunks per article
            embedding = await get_embedding(chunk)
            vectors.append({
                "id": f"{article_id}_chunk_{i}",
                "values": embedding,
                "metadata": {
                    "article_id": article_id,
                    "title": title,
                    "chunk": chunk[:500],
                    "chunk_index": i
                }
            })
        
        pinecone_index.upsert(vectors=vectors, namespace="articles")
        logger.info(f"Indexed {len(vectors)} chunks for article {article_id}")
        
    except Exception as e:
        logger.error(f"Failed to index article: {e}")

@api_router.post("/search", response_model=AIAnswer)
async def semantic_search(
    query: SearchQuery,
    user: User = Depends(get_current_user)
):
    """Perform semantic search and generate AI answer"""
    sources = []
    seen_articles = set()
    
    # First: MongoDB keyword search (more reliable for exact matches)
    keywords = query.query.lower().split()
    mongo_query = {"$or": [
        {"title": {"$regex": query.query, "$options": "i"}},
        {"content": {"$regex": query.query, "$options": "i"}},
        {"summary": {"$regex": query.query, "$options": "i"}},
        {"tags": {"$in": keywords}}
    ]}
    
    keyword_articles = await db.articles.find(mongo_query, {"_id": 0}).limit(query.top_k * 2).to_list(query.top_k * 2)
    
    for art in keyword_articles:
        if art["article_id"] not in seen_articles:
            seen_articles.add(art["article_id"])
            # Higher score for title matches
            title_match = query.query.lower() in art["title"].lower()
            score = 0.9 if title_match else 0.7
            sources.append(SearchResult(
                article_id=art["article_id"],
                title=art["title"],
                content_snippet=art.get("summary", art["content"][:200]),
                score=score
            ))
    
    # Second: Semantic search in Pinecone (for conceptual matches)
    if pinecone_index and len(sources) < query.top_k:
        try:
            query_embedding = await get_embedding(query.query)
            results = pinecone_index.query(
                vector=query_embedding,
                top_k=query.top_k,
                include_metadata=True,
                namespace="articles"
            )
            
            for match in results.matches:
                article_id = match.metadata.get("article_id")
                if article_id and article_id not in seen_articles:
                    seen_articles.add(article_id)
                    sources.append(SearchResult(
                        article_id=article_id,
                        title=match.metadata.get("title", ""),
                        content_snippet=match.metadata.get("chunk", "")[:200],
                        score=match.score * 0.8  # Slightly lower weight for semantic matches
                    ))
        except Exception as e:
            logger.error(f"Pinecone search failed: {e}")
    
    # Sort by score descending
    sources = sorted(sources, key=lambda x: x.score, reverse=True)[:query.top_k]
    
    # Generate AI answer
    context = "\n\n".join([f"### {s.title}\n{s.content_snippet}" for s in sources])
    
    if context:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"search_{uuid.uuid4().hex[:8]}",
            system_message="Du bist ein hilfreicher Wissensassistent. Beantworte Fragen basierend auf dem gegebenen Kontext. Antworte immer auf Deutsch."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        answer_prompt = f"""Basierend auf dem folgenden Wissenskontext, beantworte die Frage des Nutzers präzise und hilfreich.

KONTEXT:
{context}

FRAGE: {query.query}

Gib eine klare, strukturierte Antwort. Wenn der Kontext nicht ausreicht, sage das ehrlich."""
        
        try:
            answer_message = UserMessage(text=answer_prompt)
            ai_answer = await chat.send_message(answer_message)
        except Exception as e:
            logger.error(f"AI answer generation failed: {e}")
            ai_answer = "Basierend auf den gefundenen Artikeln konnte ich relevante Informationen finden. Bitte prüfen Sie die Quellen unten."
    else:
        ai_answer = "Leider konnte ich keine relevanten Artikel zu Ihrer Anfrage finden. Bitte versuchen Sie eine andere Suche oder erstellen Sie einen neuen Wissensartikel."
    
    return AIAnswer(
        answer=ai_answer,
        sources=sources,
        query=query.query
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
    
    # Get recent articles
    recent_articles = await db.articles.find({}, {"_id": 0}).sort("updated_at", -1).limit(5).to_list(5)
    
    # Get top viewed articles (Beliebteste Artikel)
    top_articles = await db.articles.find({}, {"_id": 0}).sort("view_count", -1).limit(5).to_list(5)
    
    # Get favorite articles for current user
    favorite_articles = await db.articles.find(
        {"favorited_by": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    # Get recently viewed articles
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "recently_viewed": 1})
    recently_viewed_ids = user_data.get("recently_viewed", [])[:10] if user_data else []
    recently_viewed = []
    if recently_viewed_ids:
        for article_id in recently_viewed_ids:
            article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
            if article:
                recently_viewed.append(article)
    
    # User stats
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
        raise HTTPException(status_code=404, detail="Article not found")
    
    favorited_by = article.get("favorited_by", [])
    
    if user.user_id in favorited_by:
        # Remove from favorites
        await db.articles.update_one(
            {"article_id": article_id},
            {"$pull": {"favorited_by": user.user_id}}
        )
        return {"favorited": False, "message": "Aus Favoriten entfernt"}
    else:
        # Add to favorites
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
    """Mark article as viewed and update recently viewed list + view count"""
    # Remove if already in list, then add to front
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$pull": {"recently_viewed": article_id}}
    )
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$push": {"recently_viewed": {"$each": [article_id], "$position": 0, "$slice": 20}}}
    )
    # Increment view count on article
    await db.articles.update_one(
        {"article_id": article_id},
        {"$inc": {"view_count": 1}}
    )
    return {"message": "Marked as viewed"}

# ==================== PRESENCE / ACTIVE EDITORS ====================

@api_router.post("/articles/{article_id}/presence")
async def update_presence(article_id: str, user: User = Depends(get_current_user)):
    """Update editor presence for an article"""
    global active_editors
    
    if article_id not in active_editors:
        active_editors[article_id] = {}
    
    active_editors[article_id][user.user_id] = {
        "name": user.name,
        "picture": user.picture,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Clean up old entries (older than 30 seconds)
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=30)
    for uid in list(active_editors[article_id].keys()):
        ts = datetime.fromisoformat(active_editors[article_id][uid]["timestamp"])
        if ts < cutoff:
            del active_editors[article_id][uid]
    
    # Return other active editors (excluding current user)
    others = {uid: info for uid, info in active_editors[article_id].items() if uid != user.user_id}
    
    return {"active_editors": list(others.values())}

@api_router.delete("/articles/{article_id}/presence")
async def remove_presence(article_id: str, user: User = Depends(get_current_user)):
    """Remove editor presence when leaving article"""
    global active_editors
    
    if article_id in active_editors and user.user_id in active_editors[article_id]:
        del active_editors[article_id][user.user_id]
    
    return {"message": "Presence removed"}

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
        raise HTTPException(status_code=404, detail="Article not found")
    return article

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "CANUSA Knowledge Hub API", "version": "1.0.0"}

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
    """Initialize Pinecone on startup"""
    global pc, pinecone_index
    
    if PINECONE_API_KEY:
        try:
            pc = Pinecone(api_key=PINECONE_API_KEY)
            
            # Check if index exists, create if not
            existing_indexes = [idx.name for idx in pc.list_indexes()]
            
            if INDEX_NAME not in existing_indexes:
                pc.create_index(
                    name=INDEX_NAME,
                    dimension=1536,
                    metric="cosine",
                    spec={
                        "serverless": {
                            "cloud": "aws",
                            "region": "us-east-1"
                        }
                    }
                )
                logger.info(f"Created Pinecone index: {INDEX_NAME}")
            
            pinecone_index = pc.Index(INDEX_NAME)
            logger.info("Pinecone initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
    else:
        logger.warning("PINECONE_API_KEY not set, vector search disabled")
    
    # Create indexes in MongoDB
    await db.articles.create_index([("title", "text"), ("content", "text")])
    await db.articles.create_index("status")
    await db.articles.create_index("category_id")
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
