from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings
from app.utils.logger import logger

def get_llm_service() -> BaseChatModel:
    """Factory to retrieve the active Chat LLM model based on configuration settings."""
    provider = settings.LLM_PROVIDER.lower()
    logger.info(f"Initializing LLM model with provider: '{provider}'")
    
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            temperature=0.0
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.0
        )
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI
        logger.warning(f"Unknown LLM provider '{provider}'. Defaulting to Gemini.")
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.0
        )
