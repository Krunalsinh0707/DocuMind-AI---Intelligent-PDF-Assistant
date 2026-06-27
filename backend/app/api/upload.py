import asyncio
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, BackgroundTasks
from datetime import datetime

from app.config import settings
from app.models.response_models import UploadResponse, UploadStatusResponse
from app.models.document_models import DocumentMetadata
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user, get_vector_store_service
from app.services.file_service import file_service
from app.services.pdf_loader import get_pdf_loader_service, PDFLoaderService
from app.services.text_splitter import get_text_splitter_service, TextSplitterService
from app.services.vector_store import VectorStoreService
from app.services.job_store import job_store
from app.services.background_processor import background_process_file
from app.utils.helpers import generate_unique_id, get_file_size_mb, calculate_file_hash
from app.utils.logger import logger

router = APIRouter()

@router.post(
    "/upload",
    response_model=List[UploadResponse],
    summary="Upload PDF files",
    description="Accepts one or more PDF files and indexes them in the background."
)
async def upload_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="PDF files to upload and index"),
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db),
    pdf_loader: PDFLoaderService = Depends(get_pdf_loader_service),
    text_splitter: TextSplitterService = Depends(get_text_splitter_service),
    vector_store: VectorStoreService = Depends(get_vector_store_service)
) -> List[UploadResponse]:
    
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded."
        )

    # 1. Check maximum files limit (Max 5 PDFs at once)
    if len(files) > settings.MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_FILES_PER_UPLOAD} files allowed per upload."
        )

    # 2. Validate all files first (reject scripts, exe, zip, or files exceeding 100MB)
    for file in files:
        file_service.validate_file(file)

    responses = []
    
    for file in files:
        doc_id = generate_unique_id()
        temp_path = None
        
        try:
            logger.info(f"Processing upload for file: {file.filename} for user: {current_user['id']}")
            
            # Save file securely to upload directory
            temp_path = file_service.save_file(file, doc_id)
            
            # Calculate file hash to prevent duplicate uploads
            file_hash = calculate_file_hash(str(temp_path))
            
            # Check if this user already has this document indexed
            if db.documents is not None:
                existing_doc = db.documents.find_one({"file_hash": file_hash, "user_id": current_user["id"]})
                if existing_doc:
                    logger.info(f"File {file.filename} already indexed. Skipping processing.")
                    # Clean up the newly uploaded temp file
                    file_service.delete_file(str(temp_path))
                    responses.append(UploadResponse(
                        id=existing_doc["id"],
                        filename=existing_doc["filename"],
                        status="success",
                        chunk_count=existing_doc["chunk_count"],
                        message="Document already indexed. Do not reprocess."
                    ))
                    continue
            
            # Save upload as a background job
            job_id = f"job_{doc_id}"
            await job_store.create_job(job_id, file.filename or "document.pdf")
            
            # Add async processing to BackgroundTasks
            background_tasks.add_task(
                background_process_file,
                job_id=job_id,
                temp_path=temp_path,
                doc_id=doc_id,
                filename=file.filename or "document.pdf",
                db=db,
                pdf_loader=pdf_loader,
                text_splitter=text_splitter,
                vector_store=vector_store,
                user_id=current_user["id"],
                file_hash=file_hash
            )
            
            responses.append(UploadResponse(
                id=doc_id,
                filename=file.filename or "document.pdf",
                status="processing",
                chunk_count=0,
                message="Background processing started.",
                job_id=job_id
            ))
            
        except HTTPException as he:
            logger.error(f"HTTP error processing file {file.filename}: {he.detail}")
            if temp_path:
                file_service.delete_file(str(temp_path))
            responses.append(UploadResponse(
                id=doc_id,
                filename=file.filename or "document.pdf",
                status="failed",
                chunk_count=0,
                message=he.detail
            ))
        except Exception as e:
            logger.error(f"Unexpected error processing file {file.filename}: {str(e)}")
            if temp_path:
                file_service.delete_file(str(temp_path))
            responses.append(UploadResponse(
                id=doc_id,
                filename=file.filename or "document.pdf",
                status="failed",
                chunk_count=0,
                message=f"Internal processing error: {str(e)}"
            ))
            
    return responses

@router.get(
    "/upload-status/{job_id}",
    response_model=UploadStatusResponse,
    summary="Track the status of background upload jobs",
    description="Poll this endpoint to monitor the progress of larger PDFs processing in the background."
)
async def get_upload_status(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID {job_id} not found."
        )
    return UploadStatusResponse(
        status=job["status"],
        progress=job["progress"],
        filename=job.get("filename"),
        message=job.get("message"),
        chunk_count=job.get("chunk_count")
    )
