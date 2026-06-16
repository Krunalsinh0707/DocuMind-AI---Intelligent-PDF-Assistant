from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from typing import List
import asyncio

from app.models.document_models import DocumentMetadata, DocumentListResponse
from app.models.response_models import MessageResponse
from app.database import MongoDBManager, get_metadata_db
from app.dependencies import get_current_user, get_vector_store_service
from app.services.file_service import file_service
from app.services.pdf_loader import get_pdf_loader_service, PDFLoaderService
from app.services.text_splitter import get_text_splitter_service, TextSplitterService
from app.services.vector_store import VectorStoreService
from app.utils.constants import ERROR_DOCUMENT_NOT_FOUND
from app.utils.helpers import sanitize_filename
from app.utils.logger import logger
from app.config import settings

router = APIRouter()

@router.get(
    "/documents",
    response_model=List[DocumentMetadata],
    summary="List uploaded documents",
    description="Returns a list of metadata for all uploaded and indexed PDF documents."
)
async def list_documents(
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
) -> List[DocumentMetadata]:
    return db.get_all(current_user["id"])

@router.get(
    "/documents/{doc_id}",
    response_model=DocumentMetadata,
    summary="Get document details",
    description="Retrieves metadata details for a specific uploaded document by its unique ID."
)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
) -> DocumentMetadata:
    doc = db.get_by_id(doc_id, current_user["id"])
    if not doc:
        logger.warning(f"Document request failed: ID {doc_id} not found or access denied.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_DOCUMENT_NOT_FOUND.format(doc_id=doc_id)
        )
    return doc

@router.delete(
    "/documents/{doc_id}",
    response_model=MessageResponse,
    summary="Delete a document",
    description="Deletes a document's metadata, deletes its text chunks from the vector store, and removes the file from disk."
)
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db),
    vector_store: VectorStoreService = Depends(get_vector_store_service)
) -> MessageResponse:
    # 1. Fetch document metadata
    doc = db.get_by_id(doc_id, current_user["id"])
    if not doc:
        logger.warning(f"Document deletion failed: ID {doc_id} not found or access denied.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_DOCUMENT_NOT_FOUND.format(doc_id=doc_id)
        )

    logger.info(f"Initiating deletion for document: {doc.filename} (ID: {doc_id}) for user: {current_user['id']}")

    # 2. Delete chunks from Vector Store
    deleted_from_store = vector_store.delete_document_chunks(doc.chunk_ids)
    if not deleted_from_store:
        logger.warning(f"Failed or skipped deleting chunks for doc ID: {doc_id} from vector store.")

    # 3. Delete physical file from disk
    sanitized_name = sanitize_filename(doc.filename)
    unique_name = f"{doc_id}_{sanitized_name}"
    file_path = file_service.upload_dir / unique_name
    deleted_from_disk = file_service.delete_file(str(file_path))
    if not deleted_from_disk:
        logger.warning(f"Physical file for document ID: {doc_id} could not be deleted from disk.")

    # 4. Remove from Metadata database
    db.delete(doc_id, current_user["id"])
    logger.info(f"Successfully deleted document: {doc.filename} (ID: {doc_id})")

    return MessageResponse(
        message=f"Document '{doc.filename}' and all its associated vector chunks have been deleted."
    )

@router.get(
    "/documents/{doc_id}/download",
    summary="Download or view PDF file",
    description="Serves the physical PDF file stored on disk."
)
async def download_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db)
):
    doc = db.get_by_id(doc_id, current_user["id"])
    if not doc:
        logger.warning(f"Document download request failed: ID {doc_id} not found or access denied.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_DOCUMENT_NOT_FOUND.format(doc_id=doc_id)
        )
    sanitized_name = sanitize_filename(doc.filename)
    unique_name = f"{doc_id}_{sanitized_name}"
    file_path = file_service.upload_dir / unique_name
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical PDF file not found on server."
        )
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=doc.filename
    )

@router.post(
    "/documents/{doc_id}/reindex",
    response_model=MessageResponse,
    summary="Reindex a document",
    description="Re-extracts text and regenerates vector embeddings for a document already present on disk."
)
async def reindex_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBManager = Depends(get_metadata_db),
    pdf_loader: PDFLoaderService = Depends(get_pdf_loader_service),
    text_splitter: TextSplitterService = Depends(get_text_splitter_service),
    vector_store: VectorStoreService = Depends(get_vector_store_service)
) -> MessageResponse:
    # 1. Fetch document metadata
    doc = db.get_by_id(doc_id, current_user["id"])
    if not doc:
        logger.warning(f"Document reindexing failed: ID {doc_id} not found or access denied.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_DOCUMENT_NOT_FOUND.format(doc_id=doc_id)
        )

    sanitized_name = sanitize_filename(doc.filename)
    unique_name = f"{doc_id}_{sanitized_name}"
    file_path = file_service.upload_dir / unique_name

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical PDF file not found on disk."
        )

    logger.info(f"Initiating reindexing for document: {doc.filename} (ID: {doc_id})")

    # Delete old chunks first
    if doc.chunk_ids:
        vector_store.delete_document_chunks(doc.chunk_ids)

    # Re-run pipeline
    loop = asyncio.get_running_loop()
    pages_data = await loop.run_in_executor(
        None,
        pdf_loader.extract_text_with_metadata,
        file_path
    )
    
    chunks = await loop.run_in_executor(
        None,
        text_splitter.split_pages,
        pages_data
    )
    
    chunk_ids = await loop.run_in_executor(
        None,
        vector_store.add_documents,
        chunks,
        doc_id
    )

    # Update metadata
    doc.chunk_count = len(chunks)
    doc.chunk_ids = chunk_ids
    await loop.run_in_executor(
        None,
        db.save,
        doc,
        current_user["id"]
    )

    logger.info(f"Successfully reindexed document: {doc.filename} (ID: {doc_id})")

    return MessageResponse(
        message=f"Document '{doc.filename}' has been successfully reindexed."
    )
