from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user
from app.utils.logger import logger

router = APIRouter()

@router.get(
    "/dashboard",
    summary="Get user dashboard statistics and analytics",
    description="Calculates and returns count of documents, searches, chats, storage space, recent items, and 7-day usage analytics."
)
async def get_dashboard_data(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        
        # 1. Calculate general metrics
        total_documents = 0
        storage_used_mb = 0.0
        recent_documents = []
        
        if db.documents is not None:
            total_documents = db.documents.count_documents({"user_id": user_id})
            
            # Aggregate storage
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {"_id": None, "total_size": {"$sum": "$file_size_mb"}}}
            ]
            agg = list(db.documents.aggregate(pipeline))
            if agg and len(agg) > 0 and agg[0]["total_size"]:
                storage_used_mb = float(agg[0]["total_size"])
                
            # Recent documents
            docs_cursor = db.documents.find({"user_id": user_id}).sort("upload_timestamp", -1).limit(5)
            for d in docs_cursor:
                recent_documents.append({
                    "id": d.get("id"),
                    "filename": d.get("filename"),
                    "upload_timestamp": d.get("upload_timestamp").isoformat() if isinstance(d.get("upload_timestamp"), datetime) else d.get("upload_timestamp"),
                    "file_size_mb": round(d.get("file_size_mb", 0), 2),
                    "pages": d.get("pages", 0),
                    "questions_asked": d.get("questions_asked", 0),
                    "status": d.get("status", "indexed")
                })
                
        # 2. Chat sessions metrics
        total_chats = 0
        recent_conversations = []
        if db.chat_sessions is not None:
            total_chats = db.chat_sessions.count_documents({"user_id": user_id})
            
            chats_cursor = db.chat_sessions.find({"user_id": user_id}).sort("updated_at", -1).limit(5)
            for s in chats_cursor:
                recent_conversations.append({
                    "id": s.get("id"),
                    "title": s.get("title", "New Conversation"),
                    "updated_at": s.get("updated_at"),
                    "is_pinned": s.get("is_pinned", False)
                })
                
        # 3. Search history metrics
        total_searches = 0
        recent_searches = []
        if db.search_history is not None:
            total_searches = db.search_history.count_documents({"user_id": user_id})
            
            searches_cursor = db.search_history.find({"user_id": user_id}).sort("timestamp", -1).limit(5)
            for sh in searches_cursor:
                recent_searches.append({
                    "id": sh.get("id"),
                    "query": sh.get("query"),
                    "timestamp": sh.get("timestamp"),
                    "document_name": sh.get("document_name")
                })
                
        # 4. Generate usage analytics for the last 7 days
        # We want to return a count of searches/questions for each day in the last 7 days
        usage_analytics = []
        today = datetime.utcnow().date()
        
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            date_str = target_date.strftime("%Y-%m-%d")
            
            # Count searches on this day
            searches_count = 0
            if db.search_history is not None:
                start_iso = f"{date_str}T00:00:00"
                end_iso = f"{date_str}T23:59:59.999"
                searches_count = db.search_history.count_documents({
                    "user_id": user_id,
                    "timestamp": {"$gte": start_iso, "$lte": end_iso}
                })
                
            usage_analytics.append({
                "date": target_date.strftime("%b %d"),
                "count": searches_count
            })
            
        return {
            "total_documents": total_documents,
            "total_searches": total_searches,
            "total_chats": total_chats,
            "storage_used_mb": round(storage_used_mb, 2),
            "recent_documents": recent_documents,
            "recent_conversations": recent_conversations,
            "recent_searches": recent_searches,
            "usage_analytics": usage_analytics
        }
    except Exception as e:
        logger.error(f"Failed to calculate dashboard statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dashboard data: {str(e)}"
        )
