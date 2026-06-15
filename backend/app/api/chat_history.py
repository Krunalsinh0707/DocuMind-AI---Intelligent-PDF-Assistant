from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user
from app.utils.logger import logger
from app.utils.helpers import generate_unique_id

router = APIRouter()

class CreateSessionRequest(BaseModel):
    title: Optional[str] = Field("New Conversation", description="Title of the chat session")
    document_ids: Optional[List[str]] = Field(default=[], description="List of document IDs bound to this chat")

class ChatSessionResponse(BaseModel):
    id: str = Field(..., alias="_id_str")
    title: str
    document_ids: List[str]
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

class ChatMessageResponse(BaseModel):
    role: str
    content: str
    timestamp: float
    sources: Optional[List[dict]] = None

@router.get(
    "/chat-sessions",
    response_model=List[dict],
    summary="List all chat sessions for the current user",
    description="Retrieves a list of chat sessions created by the authenticated user."
)
async def list_chat_sessions(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    if db.chat_sessions is None:
        return []
        
    try:
        cursor = db.chat_sessions.find({"user_id": current_user["id"]}).sort("updated_at", -1)
        sessions = []
        for s in cursor:
            s["id"] = s.get("id") or str(s.get("_id"))
            s.pop("_id", None)
            sessions.append({
                "id": s["id"],
                "title": s.get("title", "New Conversation"),
                "document_ids": s.get("document_ids", []),
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at")
            })
        return sessions
    except Exception as e:
        logger.error(f"Failed to list chat sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat sessions."
        )

@router.post(
    "/chat-sessions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
    description="Creates a new conversation session for the authenticated user."
)
async def create_chat_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    if db.chat_sessions is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )
        
    try:
        session_id = f"session_{generate_unique_id()}"
        now_iso = datetime.utcnow().isoformat()
        
        session_doc = {
            "id": session_id,
            "user_id": current_user["id"],
            "title": request.title,
            "document_ids": request.document_ids,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        
        db.chat_sessions.insert_one(session_doc)
        session_doc.pop("_id", None)
        return session_doc
    except Exception as e:
        logger.error(f"Failed to create chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat session."
        )

@router.delete(
    "/chat-sessions/{session_id}",
    summary="Delete a chat session",
    description="Deletes a chat session and all messages linked to it."
)
async def delete_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    if db.chat_sessions is None or db.chat_messages is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )
        
    try:
        # Verify ownership
        session = db.chat_sessions.find_one({"id": session_id, "user_id": current_user["id"]})
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or access denied."
            )
            
        # Delete session
        db.chat_sessions.delete_one({"id": session_id})
        # Delete associated messages
        db.chat_messages.delete_many({"session_id": session_id})
        
        return {"message": "Chat session and message logs successfully deleted."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to delete chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat session."
        )

@router.get(
    "/chat-sessions/{session_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="Retrieve message history for a session",
    description="Retrieves a list of messages belonging to the specified session."
)
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    if db.chat_sessions is None or db.chat_messages is None:
        return []
        
    try:
        # Verify ownership of the session
        session = db.chat_sessions.find_one({"id": session_id, "user_id": current_user["id"]})
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or access denied."
            )
            
        cursor = db.chat_messages.find({"session_id": session_id}).sort("timestamp", 1)
        messages = []
        for m in cursor:
            messages.append(ChatMessageResponse(
                role=m.get("role", "user"),
                content=m.get("message", ""),
                timestamp=m.get("timestamp", datetime.utcnow().timestamp()),
                sources=m.get("sources")
            ))
        return messages
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to retrieve chat messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve message logs."
        )
