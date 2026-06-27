from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user
from app.utils.logger import logger

router = APIRouter()

@router.get(
    "/history",
    summary="Get user search history logs",
    description="Retrieves a list of search queries submitted by the authenticated user with optional filter parameters."
)
async def get_history(
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    document_id: Optional[str] = Query(None, description="Filter searches by specific document ID"),
    query: Optional[str] = Query(None, description="Filter searches by query text match"),
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        history = db.get_search_history(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            document_id=document_id,
            query=query
        )
        return history
    except Exception as e:
        logger.error(f"Failed to fetch search history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search history log."
        )

@router.delete(
    "/history/{entry_id}",
    summary="Delete a single search history entry",
    description="Removes a specific search log entry if owned by the current authenticated user."
)
async def delete_history_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        deleted = db.delete_search_history_entry(user_id=user_id, entry_id=entry_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Search history entry not found or access denied."
            )
        return {"message": "Search history entry deleted successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to delete search history entry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete search history entry."
        )

@router.delete(
    "/history",
    summary="Clear all search history logs",
    description="Permanently deletes all search query logs belonging to the authenticated user."
)
async def clear_history(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    try:
        user_id = current_user["id"]
        db.clear_search_history(user_id=user_id)
        return {"message": "All search history logs successfully cleared."}
    except Exception as e:
        logger.error(f"Failed to clear search history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear search history logs."
        )
