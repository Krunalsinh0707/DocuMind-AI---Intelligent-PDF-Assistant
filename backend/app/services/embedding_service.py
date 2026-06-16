from langchain_core.embeddings import Embeddings
from app.config import settings
from app.utils.logger import logger

def get_embedding_service() -> Embeddings:
    """Factory to retrieve the active Embeddings instance based on configurations."""
    provider = settings.EMBEDDING_PROVIDER.lower()
    logger.info(f"Initializing embedding service with provider: '{provider}'")
    
    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_EMBEDDING_MODEL
        )
    elif provider == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(
            model=settings.GEMINI_EMBEDDING_MODEL,
            google_api_key=settings.GOOGLE_API_KEY
        )
    elif provider == "huggingface":
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(
            model_name=settings.HUGGINGFACE_EMBEDDING_MODEL
        )
    else:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        logger.warning(f"Unknown embedding provider '{provider}'. Defaulting to HuggingFace.")
        return HuggingFaceEmbeddings(
            model_name=settings.HUGGINGFACE_EMBEDDING_MODEL
        )
