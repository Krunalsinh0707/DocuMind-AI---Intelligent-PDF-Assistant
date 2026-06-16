from fastapi import APIRouter, Depends, HTTPException, status
from app.models.response_models import MessageResponse
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user, get_vector_store_service
from app.services.file_service import file_service
from app.services.vector_store import VectorStoreService
from app.utils.helpers import sanitize_filename
from app.utils.logger import logger

router = APIRouter()

@router.post(
    "/clear-db",
    response_model=MessageResponse,
    summary="Clear User Knowledge Base",
    description="Deletes all document metadata, FAISS vectors, and uploaded PDF files belonging to the authenticated user."
)
async def clear_user_db(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db),
    vector_store: VectorStoreService = Depends(get_vector_store_service)
) -> MessageResponse:
    try:
        user_id = current_user["id"]
        logger.info(f"System reset/clear-db requested for user: {user_id}. Clearing files, indices, and database entries...")
        
        # 1. Fetch all documents for this user
        docs = db.get_all(user_id)
        
        # 2. Reset vector database for this user
        vector_store.reset_store()
        
        # 3. Delete physical files from disk for this user
        for doc in docs:
            sanitized_name = sanitize_filename(doc.filename)
            unique_name = f"{doc.id}_{sanitized_name}"
            file_path = file_service.upload_dir / unique_name
            file_service.delete_file(str(file_path))
            
        # 4. Clear metadata database records
        db.clear(user_id)
        
        # 5. Clear user sessions and messages from MongoDB
        if db.chat_sessions is not None:
            db.chat_sessions.delete_many({"user_id": user_id})
        if db.chat_messages is not None:
            db.chat_messages.delete_many({"user_id": user_id})
            
        logger.info(f"Reset completed successfully for user: {user_id}")
        return MessageResponse(
            message="Your personal knowledge base and chat logs have been successfully cleared."
        )
    except Exception as e:
        logger.error(f"User reset failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear knowledge base: {str(e)}"
        )
