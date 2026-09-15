from typing import Any, List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from app.config import settings
from app.utils.logger import logger

class MockChatModel(BaseChatModel):
    """A mock chat model for local development and offline testing."""
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Return a mock ChatResult back
        generation = ChatGeneration(
            message=AIMessage(content="This is a mock RAG response. DocuMind AI is working perfectly in mock mode!"),
            text="This is a mock RAG response. DocuMind AI is working perfectly in mock mode!"
        )
        return ChatResult(generations=[generation])


    @property
    def _llm_type(self) -> str:
        return "mock-chat-model"

_llm_service_instance = None

def get_llm_service(force_reload: bool = False) -> BaseChatModel:
    """Factory to retrieve the active Chat LLM model based on configuration settings."""
    global _llm_service_instance
    if _llm_service_instance is not None and not force_reload:
        return _llm_service_instance
        
    provider = settings.LLM_PROVIDER.lower()
    logger.info(f"Initializing LLM model with provider: '{provider}'")
    
    if provider == "mock":
        logger.info("Using local MockChatModel for fast offline developer testing.")
        _llm_service_instance = MockChatModel()
    elif provider == "openrouter":
        from langchain_openai import ChatOpenAI
        api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        if not api_key:
            logger.warning("OPENROUTER_API_KEY is not set. OpenRouter requests will fail unless configured in .env.")
            api_key = "missing_api_key_placeholder"
        logger.info(f"Using OpenRouter with model: '{settings.OPENROUTER_MODEL}' at '{settings.OPENROUTER_BASE_URL}'")
        _llm_service_instance = ChatOpenAI(
            api_key=api_key,
            base_url=settings.OPENROUTER_BASE_URL,
            model=settings.OPENROUTER_MODEL,
            temperature=0.0,
            max_tokens=700,
            streaming=False,
            timeout=30.0,
            max_retries=2,
            default_headers={
                "HTTP-Referer": "https://documind.ai",
                "X-Title": "DocuMind AI"
            }
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY is not set. OpenAI requests may fail.")
        logger.info(f"Using OpenAI with model: '{settings.OPENAI_MODEL}'")
        _llm_service_instance = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            temperature=0.0
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY is not set. Gemini requests may fail.")
        logger.info(f"Using Gemini with model: '{settings.GEMINI_MODEL}'")
        _llm_service_instance = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.0
        )
    else:
        logger.warning(f"Unknown LLM provider '{provider}'. Defaulting to MockChatModel.")
        _llm_service_instance = MockChatModel()
    return _llm_service_instance


