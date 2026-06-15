import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    # API Providers and Keys
    LLM_PROVIDER: str = Field(default="gemini", description="llm provider: openai or gemini")
    EMBEDDING_PROVIDER: str = Field(default="huggingface", description="embedding provider: openai, gemini or huggingface")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    GOOGLE_API_KEY: str = Field(default="", description="Google API key for Gemini")
    
    # Model Configurations
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", validation_alias=AliasChoices("OPENAI_MODEL", "OPENAI_LLM_MODEL"))
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash", validation_alias=AliasChoices("GEMINI_MODEL", "GEMINI_LLM_MODEL"))
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-2"
    HUGGINGFACE_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # RAG parameters
    CHUNK_SIZE: int = 2000
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 5
    
    # Directory paths (relative to app directory or project root)
    UPLOAD_DIR: str = "uploads"
    FAISS_DB_DIR: str = "faiss_db"
    
    # File limits
    MAX_FILE_SIZE_MB: int = 100
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024
    MAX_FILES_PER_UPLOAD: int = 5
    TOTAL_UPLOAD_LIMIT_MB: int = 500
    ASYNC_THRESHOLD_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = ["pdf"]
    
    # MongoDB Settings
    MONGODB_URI: str = Field(default="mongodb://localhost:27017", description="MongoDB connection URI")
    DATABASE_NAME: str = Field(default="documind_ai", description="MongoDB database name")

    # Auth Settings
    JWT_SECRET_KEY: str = Field(default="dev-jwt-secret-key-change-in-production-12345", description="JWT secret key")
    FIREBASE_PROJECT_ID: str = Field(default="", description="Firebase project ID")

    # CORS Configuration
    CORS_ORIGINS: List[str] = ["*"]
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def active_llm_model(self) -> str:
        if self.LLM_PROVIDER.lower() == "gemini":
            return self.GEMINI_MODEL
        return self.OPENAI_MODEL

    @property
    def active_embedding_model(self) -> str:
        provider = self.EMBEDDING_PROVIDER.lower()
        if provider == "gemini":
            return self.GEMINI_EMBEDDING_MODEL
        elif provider == "huggingface":
            return self.HUGGINGFACE_EMBEDDING_MODEL
        return self.OPENAI_EMBEDDING_MODEL

# Global settings instance
settings = Settings()
