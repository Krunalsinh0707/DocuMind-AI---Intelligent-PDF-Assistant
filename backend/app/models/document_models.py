from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class DocumentMetadata(BaseModel):
    """Schema representing the metadata of an uploaded PDF document."""
    id: str = Field(..., description="Unique document ID (UUID)")
    filename: str = Field(..., description="Original filename of the PDF")
    upload_timestamp: datetime = Field(..., description="Timestamp when the file was uploaded")
    file_size_mb: float = Field(..., description="File size in Megabytes")
    chunk_count: int = Field(..., description="Number of text chunks generated")
    chunk_ids: List[str] = Field(default=[], description="Internal IDs of chunks in FAISS")
    user_id: Optional[str] = Field(None, description="Owner user ID")
    status: str = Field(default="indexed", description="Indexing status")

class DocumentListResponse(BaseModel):
    """Response schema for listing documents."""
    documents: List[DocumentMetadata] = Field(default=[], description="List of uploaded documents metadata")
