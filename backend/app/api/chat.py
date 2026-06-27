import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.chat_models import ChatRequest, ChatResponse
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user, get_rag_chain_service
from app.services.rag_chain import RAGChainService
from app.utils.logger import logger
from app.utils.helpers import generate_unique_id

router = APIRouter()

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with documents",
    description="Asks a question to the retrieved knowledge base using contextual retrieval and conversation history."
)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db),
    rag_chain: RAGChainService = Depends(get_rag_chain_service)
) -> ChatResponse:
    try:
        logger.info(f"Received chat question: '{request.question}' for user: {current_user['id']}, session_id: {request.session_id}")
        
        # 1. Load history from database if session_id is provided
        history = request.history or []
        session_doc = None
        
        if request.session_id and db.chat_sessions is not None:
            session_doc = db.chat_sessions.find_one({"id": request.session_id, "user_id": current_user["id"]})
            if not session_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found or access denied."
                )
            
            # Fetch message history from db instead of request payload if payload history is empty
            if not request.history and db.chat_messages is not None:
                cursor = db.chat_messages.find({"session_id": request.session_id}).sort("timestamp", 1)
                db_history = []
                last_user_msg = None
                for m in cursor:
                    role = m.get("role")
                    content = m.get("message")
                    if role == "user":
                        last_user_msg = content
                    elif role == "assistant" and last_user_msg:
                        db_history.append([last_user_msg, content])
                        last_user_msg = None
                history = db_history
                
        # 2. Run LLM QA chain (run in executor to keep event loop responsive)
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            rag_chain.answer_question,
            request.question,
            history
        )
        
        # 3. Log user message and assistant message to MongoDB if session exists
        if request.session_id and db.chat_sessions is not None:
            now_iso = datetime.utcnow().isoformat()
            now_ts = datetime.utcnow().timestamp()
            
            # Save User Message
            user_msg_doc = {
                "id": f"msg_{generate_unique_id()}",
                "session_id": request.session_id,
                "user_id": current_user["id"],
                "role": "user",
                "message": request.question,
                "timestamp": now_ts
            }
            db.chat_messages.insert_one(user_msg_doc)
            
            # Save Assistant Message
            assistant_msg_doc = {
                "id": f"msg_{generate_unique_id()}",
                "session_id": request.session_id,
                "user_id": current_user["id"],
                "role": "assistant",
                "message": response.answer,
                "timestamp": now_ts + 0.1,  # Offset slightly to ensure correct sorting order
                "sources": [s.model_dump() for s in response.sources]
            }
            db.chat_messages.insert_one(assistant_msg_doc)
            
            # Update Session updated_at timestamp
            db.chat_sessions.update_one(
                {"id": request.session_id},
                {"$set": {"updated_at": now_iso}}
            )

        # 4. Log search history and increment document questions_asked
        session_title = None
        if request.session_id and db.chat_sessions is not None:
            if not session_doc:
                session_doc = db.chat_sessions.find_one({"id": request.session_id, "user_id": current_user["id"]})
            if session_doc:
                session_title = session_doc.get("title", "New Conversation")
                
        primary_doc_id = None
        primary_doc_name = None
        if response.sources and db.documents is not None:
            first_source = response.sources[0]
            primary_doc_name = first_source.source_name
            doc_record = db.documents.find_one({"user_id": current_user["id"], "filename": first_source.source_name})
            if doc_record:
                primary_doc_id = doc_record.get("id")
                
        if db.search_history is not None:
            db.save_search_history(
                user_id=current_user["id"],
                query=request.question,
                session_id=request.session_id,
                doc_id=primary_doc_id,
                doc_name=primary_doc_name,
                session_title=session_title
            )
            
        if response.sources and db.documents is not None:
            cited_filenames = set(s.source_name for s in response.sources)
            for fname in cited_filenames:
                db.documents.update_one(
                    {"user_id": current_user["id"], "filename": fname},
                    {"$inc": {"questions_asked": 1}}
                )
            
        return response
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to process chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
