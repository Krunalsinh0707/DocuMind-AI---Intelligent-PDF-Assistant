from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user
from app.utils.logger import logger

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="New display name")
    email: Optional[str] = Field(None, description="New email address")
    profile_picture: Optional[str] = Field(None, description="New profile picture URL")

@router.get(
    "/profile",
    summary="Get user profile and dashboard statistics",
    description="Calculates and returns metrics on user documents count, total chats count, storage space, profile info, and recent activities."
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
        latest_uploads = []
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
                
            # Get latest 5 uploads
            uploads_cursor = db.documents.find({"user_id": user_id}).sort("upload_timestamp", -1).limit(5)
            for d in uploads_cursor:
                latest_uploads.append({
                    "id": d.get("id"),
                    "filename": d.get("filename"),
                    "upload_timestamp": d.get("upload_timestamp").isoformat() if isinstance(d.get("upload_timestamp"), datetime) else d.get("upload_timestamp"),
                    "file_size_mb": round(d.get("file_size_mb", 0), 2),
                    "pages": d.get("pages", 0)
                })
                
        # Calculate chat sessions metrics
        session_count = 0
        latest_chats = []
        if db.chat_sessions is not None:
            session_count = db.chat_sessions.count_documents({"user_id": user_id})
            chats_cursor = db.chat_sessions.find({"user_id": user_id}).sort("updated_at", -1).limit(5)
            for s in chats_cursor:
                latest_chats.append({
                    "id": s.get("id"),
                    "title": s.get("title", "New Conversation"),
                    "updated_at": s.get("updated_at")
                })
            
        # Calculate messages/questions asked
        question_count = 0
        if db.chat_messages is not None:
            question_count = db.chat_messages.count_documents({"user_id": user_id, "role": "user"})

        # Get total searches
        total_searches = 0
        latest_searches = []
        if db.search_history is not None:
            total_searches = db.search_history.count_documents({"user_id": user_id})
            searches_cursor = db.search_history.find({"user_id": user_id}).sort("timestamp", -1).limit(5)
            for sh in searches_cursor:
                latest_searches.append({
                    "id": sh.get("id"),
                    "query": sh.get("query"),
                    "timestamp": sh.get("timestamp"),
                    "document_name": sh.get("document_name")
                })

        # Calculate average daily usage
        created_at_str = current_user.get("created_at")
        days_active = 1
        if created_at_str:
            try:
                # Handle possible formats
                if "T" in created_at_str:
                    created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                else:
                    created_at_dt = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")
                delta = datetime.utcnow() - created_at_dt.replace(tzinfo=None)
                days_active = max(1, delta.days)
            except Exception:
                pass
        
        average_daily_usage = round(question_count / days_active, 1)

        recent_login = []
        if current_user.get("last_login"):
            recent_login.append({
                "activity_type": "login",
                "timestamp": current_user.get("last_login"),
                "description": "User logged in to the application"
            })
        if current_user.get("created_at"):
            recent_login.append({
                "activity_type": "registration",
                "timestamp": current_user.get("created_at"),
                "description": "Account created"
            })

        return {
            "id": current_user.get("id"),
            "name": current_user.get("name", "DocuMind User"),
            "email": current_user.get("email", ""),
            "profile_picture": current_user.get("profile_picture"),
            "role": current_user.get("role", "user"),
            "created_at": current_user.get("created_at"),
            "last_login": current_user.get("last_login"),
            "auth_provider": current_user.get("auth_provider", "Google OAuth"),
            
            # Metrics
            "doc_count": doc_count,
            "session_count": session_count,
            "question_count": question_count,
            "storage_used_mb": round(total_storage_mb, 2),
            "total_searches": total_searches,
            "average_daily_usage": average_daily_usage,
            
            # Activity logs
            "latest_uploads": latest_uploads,
            "latest_searches": latest_searches,
            "latest_chats": latest_chats,
            "recent_login": recent_login
        }
    except Exception as e:
        logger.error(f"Failed to load user profile metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user profile metrics: {str(e)}"
        )

@router.put(
    "/profile",
    summary="Update user profile information",
    description="Updates the user's name, email, and/or profile picture URL in the database."
)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        updated_user = db.update_user_profile(
            user_id=user_id,
            name=request.name,
            email=request.email,
            profile_picture=request.profile_picture
        )
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile information."
            )
        return {
            "name": updated_user.get("name"),
            "email": updated_user.get("email"),
            "profile_picture": updated_user.get("profile_picture"),
            "message": "Profile updated successfully."
        }
    except Exception as e:
        logger.error(f"Failed to update profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile information."
        )
