from typing import Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., description="System operational status")

class MessageResponse(BaseModel):
    message: str = Field(..., description="Generic message feedback")

class UploadResponse(BaseModel):
    id: str = Field(..., description="Unique document UUID")
    filename: str = Field(..., description="Original name of the uploaded file")
    status: str = Field(..., description="Upload/Processing status: success, processing, failed")
    chunk_count: int = Field(..., description="Number of text chunks processed")
    message: str = Field(..., description="Status message description")
    job_id: Optional[str] = Field(None, description="Background job ID if processed asynchronously")

class UploadStatusResponse(BaseModel):
    status: str = Field(..., description="Background processing status")
    progress: int = Field(..., description="Progress percentage (0 to 100)")
    filename: Optional[str] = Field(None, description="Name of the file being processed")
    message: Optional[str] = Field(None, description="Current task message")
    chunk_count: Optional[int] = Field(None, description="Generated vector chunks count")
