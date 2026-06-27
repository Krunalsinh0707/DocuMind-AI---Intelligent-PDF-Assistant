from typing import List
from langchain_core.embeddings import Embeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings
from app.utils.logger import logger

class MockEmbeddings(Embeddings):
    """Mock embedding service for offline local testing."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.1] * 768 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return [0.1] * 768

_embedding_service_instance = None

def get_embedding_service() -> Embeddings:
    """Factory to retrieve the active Embeddings instance based on configurations."""
    global _embedding_service_instance
    if _embedding_service_instance is not None:
        return _embedding_service_instance
        
    provider = settings.EMBEDDING_PROVIDER.lower()
    logger.info(f"Initializing embedding service with provider: '{provider}'")
    
    if provider == "mock":
        logger.info("Using local MockEmbeddings for fast offline developer testing.")
        _embedding_service_instance = MockEmbeddings()
    else:
        logger.info(f"Using HuggingFaceEmbeddings with model: '{settings.EMBEDDING_MODEL}'")
        _embedding_service_instance = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL
        )
    return _embedding_service_instance

