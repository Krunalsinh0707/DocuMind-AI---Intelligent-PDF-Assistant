import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.middleware.cors import add_cors_middleware
from app.api import upload, chat, chat_history, documents, health, profile, reset, dashboard, history
from app.utils.logger import logger
from app.services.file_service import file_service
from app.database import metadata_db

# Initialize FastAPI application
app = FastAPI(
    title="DocuMind AI API",
    description="Production-ready FastAPI backend for document indexing and Retrieval-Augmented Generation.",
    version="1.0.0"
)

# Setup CORS middleware
add_cors_middleware(app)

# Include API routers
app.include_router(health.router, tags=["Health"])
app.include_router(upload.router, tags=["Upload"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(chat_history.router, tags=["Chat History"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(profile.router, tags=["Profile"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(history.router, tags=["History"])
app.include_router(reset.router, tags=["Reset"])

# Startup Event
@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("LLM PROVIDER:", settings.LLM_PROVIDER)
    print("GEMINI MODEL:", settings.GEMINI_MODEL)
    print("OPENAI MODEL:", settings.OPENAI_MODEL)
    print("Embedding Provider:", settings.EMBEDDING_PROVIDER)
    print("Embedding Model:", settings.EMBEDDING_MODEL)
    print("=" * 50)
    logger.info("Starting up DocuMind AI API...")
    # Initialize necessary folders on startup
    file_service._init_dir()
    metadata_db._init_db()
    logger.info("Directory paths and MongoDB database initialized successfully.")

from fastapi.exceptions import HTTPException

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == status.HTTP_400_BAD_REQUEST and (
        "File exceeds" in str(exc.detail) or 
        "Only PDF" in str(exc.detail) or 
        "Maximum" in str(exc.detail) or
        "Limit of" in str(exc.detail)
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error for request {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Request validation failed for {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Input validation failed.", "errors": exc.errors()}
    )

@app.get("/")
async def root():
    return {
        "app": "DocuMind AI API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/debug/config")
async def debug_config():
    import os
    derived_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    derived_env = os.path.abspath(derived_env)
    return {
        "provider": settings.LLM_PROVIDER,
        "gemini_model": settings.GEMINI_MODEL,
        "openai_model": settings.OPENAI_MODEL,
        "env_path_derived": derived_env,
        "cwd": os.getcwd(),
        "pid": os.getpid()
    }

@app.get("/debug/embeddings")
async def debug_embeddings():
    return {
        "provider": settings.EMBEDDING_PROVIDER,
        "model": settings.EMBEDDING_MODEL,
        "status": "working"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
