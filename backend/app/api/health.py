from fastapi import APIRouter, Depends, HTTPException, status
from app.models.response_models import HealthResponse
from app.database import MongoDBManager, get_metadata_db

router = APIRouter()

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the current status of the backend API service."
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy")

@router.get(
    "/health/database",
    summary="Database Health Check",
    description="Checks the connection status to the MongoDB Atlas cluster."
)
async def database_health_check(
    db: MongoDBManager = Depends(get_metadata_db)
):
    is_connected = db._connected
    if not is_connected:
        try:
            db._init_db()
            is_connected = db._connected
        except Exception:
            pass
            
    if not is_connected:
        return {
            "database": "disconnected",
            "collections": 0,
            "status": "unhealthy"
        }
        
    try:
        col_names = db.db.list_collection_names()
        count = len(col_names)
        return {
            "database": "connected",
            "collections": count,
            "status": "healthy"
        }
    except Exception as e:
        return {
            "database": "error",
            "collections": 0,
            "status": "unhealthy",
            "detail": str(e)
        }
