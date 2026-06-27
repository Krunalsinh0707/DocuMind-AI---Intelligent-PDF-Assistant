import asyncio
from pathlib import Path
from datetime import datetime

from app.services.job_store import job_store
from app.utils.logger import logger
from app.utils.helpers import get_file_size_mb
from app.models.document_models import DocumentMetadata

async def background_process_file(
    job_id: str,
    temp_path: Path,
    doc_id: str,
    filename: str,
    db,
    pdf_loader,
    text_splitter,
    vector_store,
    user_id: str,
    file_hash: str
) -> None:
    """Processes large PDFs asynchronously.
    
    Performs PDF extraction, chunking, and FAISS indexing inside a ThreadPoolExecutor 
    so it doesn't block FastAPI's event loop. Updates progress in job_store.
    """
    try:
        logger.info(f"Background process started for job {job_id}, user: {user_id}, file: {filename}")
        
        # 1. Update progress: 15% - Extracting text
        await job_store.update_job(
            job_id,
            status="processing",
            progress=15,
            message="Extracting text from PDF pages..."
        )
        
        loop = asyncio.get_running_loop()
        pages_data = await loop.run_in_executor(
            None,
            pdf_loader.extract_text_with_metadata,
            temp_path
        )
        
        # 2. Update progress: 40% - Splitting text
        await job_store.update_job(
            job_id,
            status="processing",
            progress=40,
            message="Splitting text into chunks..."
        )
        
        chunks = await loop.run_in_executor(
            None,
            text_splitter.split_pages,
            pages_data
        )
        
        # 3. Update progress: 60% - Indexing in Vector DB
        await job_store.update_job(
            job_id,
            status="processing",
            progress=60,
            message="Generating embeddings and indexing chunks..."
        )
        
        chunk_ids = await loop.run_in_executor(
            None,
            vector_store.add_documents,
            chunks,
            doc_id,
            job_id
        )
        
        # 4. Save metadata to DB
        file_size = get_file_size_mb(str(temp_path))
        doc_metadata = DocumentMetadata(
            id=doc_id,
            filename=filename,
            upload_timestamp=datetime.utcnow(),
            file_size_mb=file_size,
            chunk_count=len(chunks),
            chunk_ids=chunk_ids,
            user_id=user_id,
            status="indexed",
            pages=len(pages_data),
            questions_asked=0,
            file_hash=file_hash
        )
        
        await loop.run_in_executor(
            None,
            db.save,
            doc_metadata,
            user_id
        )
        
        # 5. Success!
        await job_store.update_job(
            job_id,
            status="success",
            progress=100,
            message="Document uploaded and vector embeddings generated successfully.",
            chunk_count=len(chunks)
        )
        logger.info(f"Background process completed successfully for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error in background process for job {job_id}: {str(e)}", exc_info=True)
        # Clean up saved file if it exists
        try:
            if temp_path.exists():
                temp_path.unlink()
        except Exception as delete_err:
            logger.error(f"Failed to delete temp file {temp_path}: {str(delete_err)}")
            
        err_msg = str(e)
        if hasattr(e, "detail") and e.detail:
            err_msg = e.detail
            
        await job_store.update_job(
            job_id,
            status="failed",
            progress=0,
            message=f"Internal processing error: {err_msg}"
        )
