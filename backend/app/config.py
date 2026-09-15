import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    # API Providers and Keys
    LLM_PROVIDER: str = Field(default="openrouter", description="llm provider: openrouter, openai, or gemini")
    EMBEDDING_PROVIDER: str = Field(default="huggingface", description="embedding provider: openai, gemini or huggingface")
    EMBEDDING_MODEL: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", description="Embedding model name")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    GOOGLE_API_KEY: str = Field(default="", description="Google API key for Gemini")
    OPENROUTER_API_KEY: str = Field(default="", description="OpenRouter API key")
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1", description="OpenRouter base URL")
    
    # Model Configurations
    OPENROUTER_MODEL: str = Field(default="nex-agi/nex-n2.5-mini:free", validation_alias=AliasChoices("OPENROUTER_MODEL", "OPENROUTER_LLM_MODEL"))
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", validation_alias=AliasChoices("OPENAI_MODEL", "OPENAI_LLM_MODEL"))
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash", validation_alias=AliasChoices("GEMINI_MODEL", "GEMINI_LLM_MODEL"))
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-2"
    HUGGINGFACE_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # RAG parameters
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 150
    TOP_K: int = 4
    
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
        provider = self.LLM_PROVIDER.lower()
        if provider == "openrouter":
            return self.OPENROUTER_MODEL
        elif provider == "gemini":
            return self.GEMINI_MODEL
        elif provider == "openai":
            return self.OPENAI_MODEL
        return self.OPENROUTER_MODEL
 
    @property
    def active_embedding_model(self) -> str:
        provider = self.EMBEDDING_PROVIDER.lower()
        if provider == "mock":
            return "mock"
        return self.EMBEDDING_MODEL
 
# Global settings instance
settings = Settings()
