import time
import re
from typing import List, Optional
from fastapi import HTTPException, status
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.config import settings
from app.services.vector_store import VectorStoreService
from app.models.chat_models import ChatResponse, SourceCitation
from app.utils.logger import logger

def _sanitize_error_message(err_msg: str) -> str:
    """Removes any potential API keys from error messages."""
    sanitized = re.sub(r'sk-[a-zA-Z0-9_\-]{20,}', '[REDACTED_API_KEY]', err_msg)
    sanitized = re.sub(r'sk-or-v1-[a-zA-Z0-9_\-]{20,}', '[REDACTED_API_KEY]', sanitized)
    if settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY) > 8:
        sanitized = sanitized.replace(settings.OPENROUTER_API_KEY, '[REDACTED_API_KEY]')
    if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 8:
        sanitized = sanitized.replace(settings.OPENAI_API_KEY, '[REDACTED_API_KEY]')
    if settings.GOOGLE_API_KEY and len(settings.GOOGLE_API_KEY) > 8:
        sanitized = sanitized.replace(settings.GOOGLE_API_KEY, '[REDACTED_API_KEY]')
    return sanitized

def _map_llm_exception(e: Exception) -> HTTPException:
    """Maps LLM provider errors to clean, informative HTTP exceptions without leaking credentials."""
    err_str = _sanitize_error_message(str(e))
    provider_name = settings.LLM_PROVIDER.capitalize()
    
    # 1. Missing API key
    if settings.LLM_PROVIDER.lower() == "openrouter" and not settings.OPENROUTER_API_KEY:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenRouter API key is missing. Please configure OPENROUTER_API_KEY in your backend .env file."
        )
    elif settings.LLM_PROVIDER.lower() == "openai" and not settings.OPENAI_API_KEY:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAI API key is missing. Please configure OPENAI_API_KEY in your backend .env file."
        )
    elif settings.LLM_PROVIDER.lower() == "gemini" and not settings.GOOGLE_API_KEY:
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Gemini API key is missing. Please configure GOOGLE_API_KEY in your backend .env file."
        )

    # 2. Check for authentication errors (401)
    if "401" in err_str or "unauthorized" in err_str.lower() or "authentication" in err_str.lower() or "invalid_api_key" in err_str.lower() or "user not found" in err_str.lower():
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"{provider_name} API key is invalid or unauthorized. Please verify your API key."
        )
        
    # 3. Insufficient credits / Payment required (402)
    if "402" in err_str or "insufficient" in err_str.lower() or "credits" in err_str.lower() or "payment required" in err_str.lower() or "quota" in err_str.lower():
        return HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"{provider_name} credits/rate limit exceeded. Please check your account balance."
        )
        
    # 4. Model not found (404)
    if "404" in err_str or "model not found" in err_str.lower() or "does not exist" in err_str.lower():
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{provider_name} model was not found: '{settings.active_llm_model}'. Please check your model configuration."
        )

    # 5. Rate limiting (429)
    if "429" in err_str or "rate limit" in err_str.lower() or "too many requests" in err_str.lower():
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{provider_name} credits/rate limit exceeded. Please try again shortly."
        )

    # 6. Context length / Token limits
    if "context_length_exceeded" in err_str.lower() or "maximum context length" in err_str.lower() or ("token" in err_str.lower() and "limit" in err_str.lower()):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{provider_name} request exceeded the available context limit. Please try a shorter query."
        )

    # 7. Timeout / Network connection
    if "timeout" in err_str.lower() or "timed out" in err_str.lower() or "connection error" in err_str.lower() or "connecterror" in err_str.lower():
        return HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"{provider_name} request timed out or network error occurred. Please try again."
        )

    # Fallback
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"{provider_name} error: {err_str}"
    )

class RAGChainService:
    def __init__(self, vector_store: VectorStoreService, llm: BaseChatModel):
        self.vector_store = vector_store
        self.llm = llm

    def answer_question(self, question: str, history: Optional[List[List[str]]] = None) -> ChatResponse:
        """Runs QA over the retrieved context using conversational history."""
        t_req_start = time.perf_counter()
        logger.info("[PERF] Request received")
        logger.info(f"[LLM] Provider: {settings.LLM_PROVIDER}")
        logger.info(f"[LLM] Model: {settings.active_llm_model}")
        
        # 1. Retrieve context
        t_faiss_start = time.perf_counter()
        logger.info("[PERF] FAISS search started")
        try:
            results = self.vector_store.similarity_search(question, k=settings.TOP_K)
        except Exception as e:
            logger.warning(f"Failed to search vector store: {str(e)}. Proceeding without context.")
            results = []
        t_faiss_elapsed = time.perf_counter() - t_faiss_start
        logger.info(f"[PERF] FAISS search completed: {t_faiss_elapsed:.2f}s")
            
        context_str = ""
        sources = []
        
        for doc, score in results:
            context_str += f"\n---\nDocument: {doc.metadata.get('source', 'unknown')}\nPage: {doc.metadata.get('page', 'unknown')}\nContent: {doc.page_content}\n"
            sources.append(SourceCitation(
                source_name=doc.metadata.get("source", "unknown"),
                content=doc.page_content,
                score=float(score) if score is not None else None,
                page=doc.metadata.get("page")
            ))
            
        # 2. Build system message with context
        system_prompt = (
            "You are DocuMind AI, an intelligent document assistant.\n\n"
            "Answer questions using the provided document context whenever possible.\n\n"
            "Do not invent facts that are not supported by the provided document context.\n\n"
            "If the answer cannot be found in the provided context, clearly say that the information was not found in the uploaded document.\n\n"
            "For summaries, summarize the supplied document content accurately and concisely.\n\n"
            "For questions about the document, prioritize the retrieved document context over general knowledge.\n\n"
            f"Retrieved Document Context:\n{context_str if context_str else 'No relevant document context found.'}"
        )
        
        messages = [SystemMessage(content=system_prompt)]
        
        # 3. Add conversation history
        if history:
            for user_msg, assistant_msg in history:
                messages.append(HumanMessage(content=user_msg))
                messages.append(AIMessage(content=assistant_msg))
                
        # 4. Add current query
        messages.append(HumanMessage(content=question))
        
        # 5. Call LLM
        if settings.LLM_PROVIDER.lower() == "openrouter" and (not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "missing_api_key_placeholder"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenRouter API key is missing. Please configure OPENROUTER_API_KEY in your backend .env file."
            )

        provider_title = "OpenRouter" if settings.LLM_PROVIDER.lower() == "openrouter" else settings.LLM_PROVIDER.capitalize()
        t_llm_start = time.perf_counter()
        logger.info(f"[PERF] {provider_title} request started")
        try:
            response = self.llm.invoke(messages)
            t_llm_elapsed = time.perf_counter() - t_llm_start
            logger.info(f"[PERF] {provider_title} response received: {t_llm_elapsed:.2f}s")

            if isinstance(response.content, list):
                # Format list of content blocks (e.g. text blocks)
                answer = "".join(
                    block if isinstance(block, str) else (block.get("text", "") if isinstance(block, dict) else str(block))
                    for block in response.content
                )
            else:
                answer = str(response.content) if response.content is not None else ""
                
            if not answer.strip():
                answer = "I could not find relevant information in the uploaded document to answer your question."
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"LLM execution failed: {_sanitize_error_message(str(e))}")
            raise _map_llm_exception(e)
            
        t_total_elapsed = time.perf_counter() - t_req_start
        logger.info(f"[PERF] Total /chat time: {t_total_elapsed:.2f}s")
        
        return ChatResponse(
            answer=answer,
            sources=sources
        )

