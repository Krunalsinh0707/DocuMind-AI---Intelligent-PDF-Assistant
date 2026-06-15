from fastapi import APIRouter, Depends, HTTPException, status
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user
from app.utils.logger import logger

router = APIRouter()

@router.get(
    "/profile",
    summary="Get user profile and dashboard statistics",
    description="Calculates and returns metrics on user documents count, total chats count, storage space, and profile info."
)
async def get_profile_stats(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        
        # Calculate documents metrics
        doc_count = 0
        total_storage_mb = 0.0
        if db.documents is not None:
            doc_count = db.documents.count_documents({"user_id": user_id})
            # Aggregate storage space used
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {"_id": None, "total_size": {"$sum": "$file_size_mb"}}}
            ]
            agg = list(db.documents.aggregate(pipeline))
            if agg and len(agg) > 0 and agg[0]["total_size"]:
                total_storage_mb = float(agg[0]["total_size"])
                
        # Calculate chat sessions metrics
        session_count = 0
        if db.chat_sessions is not None:
            session_count = db.chat_sessions.count_documents({"user_id": user_id})
            
        # Calculate messages/questions asked
        question_count = 0
        if db.chat_messages is not None:
            question_count = db.chat_messages.count_documents({"user_id": user_id, "role": "user"})

        return {
            "name": current_user.get("name", "DocuMind User"),
            "email": current_user.get("email", ""),
            "profile_picture": current_user.get("profile_picture"),
            "role": current_user.get("role", "user"),
            "created_at": current_user.get("created_at"),
            "doc_count": doc_count,
            "session_count": session_count,
            "question_count": question_count,
            "storage_used_mb": round(total_storage_mb, 2)
        }
    except Exception as e:
        logger.error(f"Failed to load user profile metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile metrics."
        )
