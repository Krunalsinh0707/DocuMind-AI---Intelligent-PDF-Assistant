from typing import Generator, Optional
from datetime import datetime
from fastapi import Header, HTTPException, status, Depends

from app.database import metadata_db, MongoDBManager
from app.auth import verify_token
from app.services.embedding_service import get_embedding_service
from app.services.llm_service import get_llm_service
from app.services.vector_store import VectorStoreService
from app.services.rag_chain import RAGChainService

def get_metadata_db() -> MongoDBManager:
    """Dependency to retrieve the document metadata database instance."""
    return metadata_db

async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    db: MongoDBManager = Depends(get_metadata_db)
):
    """Dependency to verify token and extract/retrieve the current user document."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
        
    # Fallback to X-User-ID header if bearer token not supplied
    if not token and x_user_id:
        token = x_user_id
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing from headers."
        )
        
    try:
        user_info = verify_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )
        
    uid = user_info["uid"]
    
    auth_provider = "Google OAuth"
    if token and len(token) == 28 and "." not in token:
        auth_provider = "Mock Bypass (Dev)"
        
    # Save user to DB if not exists
    if db.users is not None:
        try:
            user_doc = db.users.find_one({"id": uid})
            if not user_doc:
                user_doc = {
                    "id": uid,
                    "google_id": uid,
                    "name": user_info.get("name", "DocuMind User"),
                    "email": user_info.get("email", ""),
                    "profile_picture": user_info.get("picture"),
                    "role": user_info.get("role", "user"),
                    "created_at": datetime.utcnow().isoformat(),
                    "last_login": datetime.utcnow().isoformat(),
                    "auth_provider": auth_provider,
                    "is_active": True
                }
                db.users.insert_one(user_doc)
            else:
                db.users.update_one(
                    {"id": uid},
                    {"$set": {
                        "last_login": datetime.utcnow().isoformat(),
                        "auth_provider": auth_provider
                    }}
                )
                user_doc = db.users.find_one({"id": uid})
            return user_doc
        except Exception as e:
            print(f"Error syncing user database details: {str(e)}")
            
    # Mock fallback if MongoDB has issues
    return {
        "id": uid,
        "name": user_info.get("name", "Local Dev User"),
        "email": user_info.get("email", ""),
        "role": "user"
    }

from app.services.vector_store import get_vector_store_for_user

def get_vector_store_service(
    current_user = Depends(get_current_user),
    embeddings = Depends(get_embedding_service)
) -> VectorStoreService:
    """Dependency to retrieve a user-scoped FAISS vector store instance."""
    return get_vector_store_for_user(embeddings, user_id=current_user["id"])

def get_rag_chain_service(
    vector_store = Depends(get_vector_store_service),
    llm = Depends(get_llm_service)
) -> RAGChainService:
    """Dependency to retrieve a user-scoped RAG generation chain pipeline."""
    return RAGChainService(vector_store, llm)
