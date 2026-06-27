import os
import shutil
from pathlib import Path
from typing import List, Optional, Tuple
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from fastapi import HTTPException, status, Depends, Header
from app.services.embedding_service import get_embedding_service

from app.config import settings
from app.utils.logger import logger, log_execution_time
from app.utils.constants import ERROR_VECTOR_STORE_EMPTY

class VectorStoreService:
    """Manages the local FAISS vector store: saving, loading, search, additions, and deletions."""
    
    def __init__(self, embeddings: Embeddings, user_id: str):
        self.embeddings = embeddings
        self.user_id = user_id
        self.db_dir = Path(settings.FAISS_DB_DIR) / user_id
        self.index_name = "index"
        self._db: Optional[FAISS] = None
        self._load_db()

    def _load_db(self) -> None:
        """Loads the local FAISS index if it exists, otherwise leaves _db as None."""
        index_file = self.db_dir / f"{self.index_name}.faiss"
        if index_file.exists():
            try:
                logger.info(f"Loading local FAISS index from {self.db_dir}...")
                self._db = FAISS.load_local(
                    folder_path=str(self.db_dir),
                    embeddings=self.embeddings,
                    index_name=self.index_name,
                    allow_dangerous_deserialization=True
                )
                logger.info("Successfully loaded existing FAISS vector database.")
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {str(e)}")
                self._db = None
        else:
            logger.info("No local FAISS index found. A new one will be created upon first document upload.")
            self._db = None

    @log_execution_time
    def add_documents(self, documents: List[Document], doc_id: str, job_id: Optional[str] = None) -> List[str]:
        """Adds documents to the FAISS index in batches to save memory and handle rate limits.
        
        Args:
            documents: List of LangChain Document objects.
            doc_id: Unique identifier for the parent document.
            job_id: Optional background job ID for progress tracking.
            
        Returns:
            List[str]: Custom generated chunk IDs.
        """
        # Generate custom deterministic chunk IDs: {doc_id}_chunk_{index}
        chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(documents))]
        batch_size = 100
        
        # Extract metadata diagnostics from the first document chunk
        doc_name = "unknown"
        total_pages = 0
        if documents:
            doc_name = documents[0].metadata.get("source", "unknown")
            total_pages = documents[0].metadata.get("total_pages", 0)

        logger.info("=" * 50)
        logger.info("INDEXING DIAGNOSTICS:")
        logger.info(f"  Document Name: {doc_name}")
        logger.info(f"  Number of Pages: {total_pages}")
        logger.info(f"  Number of Chunks: {len(documents)}")
        logger.info(f"  Embedding Provider: {settings.EMBEDDING_PROVIDER}")
        logger.info(f"  Embedding Model: {settings.EMBEDDING_MODEL}")
        logger.info("=" * 50)

        try:
            total_batches = (len(documents) - 1) // batch_size + 1
            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i : i + batch_size]
                batch_ids = chunk_ids[i : i + batch_size]
                batch_idx = i // batch_size
                
                logger.info(f"Processing embedding batch {batch_idx + 1}/{total_batches} ({len(batch_docs)} chunks)...")
                
                # Report progress update to job store if job_id is provided
                if job_id:
                    import asyncio
                    from app.services.job_store import job_store
                    progress_val = int(60 + (batch_idx / total_batches) * 35)
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(job_store.update_job(
                            job_id,
                            status="processing",
                            progress=progress_val,
                            message=f"Generating embeddings and indexing: batch {batch_idx + 1} of {total_batches}"
                        ))
                    except RuntimeError:
                        pass
                
                if self._db is None:
                    logger.info("Creating a new FAISS index with first batch...")
                    self._db = FAISS.from_documents(
                        documents=batch_docs,
                        embedding=self.embeddings,
                        ids=batch_ids
                    )
                else:
                    logger.info(f"Adding batch of {len(batch_docs)} chunks to existing FAISS index...")
                    self._db.add_documents(documents=batch_docs, ids=batch_ids)
                    
            # Save updated index back to disk after all batches are processed
            self.save_local()
            logger.info(f"Successfully added and saved {len(documents)} chunks to FAISS index in batches.")
            return chunk_ids
        except Exception as e:
            logger.error(f"Error adding documents to FAISS: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate embeddings. Reason: {str(e)}. Suggested Fix: Check your API key or model availability."
            )

    @log_execution_time
    def delete_document_chunks(self, chunk_ids: List[str]) -> bool:
        """Deletes chunks from the FAISS vector database by their custom IDs."""
        if self._db is None:
            logger.warning("Attempted to delete chunks but vector database is empty/does not exist.")
            return False
            
        try:
            # Check if any chunk IDs exist in the index docstore
            valid_ids = [cid for cid in chunk_ids if cid in self._db.docstore._dict]
            
            if not valid_ids:
                logger.warning("No matching chunk IDs found in FAISS docstore.")
                return False
                
            logger.info(f"Deleting {len(valid_ids)} chunks from FAISS index...")
            self._db.delete(ids=valid_ids)
            
            # If docstore is now completely empty, reset index
            if not self._db.docstore._dict:
                logger.info("Vector database is now empty. Deleting index files from disk.")
                self.reset_store()
            else:
                self.save_local()
                
            return True
        except Exception as e:
            logger.error(f"Error deleting chunks from FAISS: {str(e)}")
            return False

    def save_local(self) -> None:
        """Saves the current state of the FAISS index to the local file system."""
        if self._db is not None:
            self.db_dir.mkdir(parents=True, exist_ok=True)
            self._db.save_local(folder_path=str(self.db_dir), index_name=self.index_name)
            logger.info("FAISS index saved to local disk.")

    def reset_store(self) -> None:
        """Deletes all local index files and resets the DB instance state."""
        self._db = None
        if self.db_dir.exists():
            # Delete FAISS files only
            faiss_file = self.db_dir / f"{self.index_name}.faiss"
            pkl_file = self.db_dir / f"{self.index_name}.pkl"
            
            try:
                if faiss_file.exists():
                    faiss_file.unlink()
                if pkl_file.exists():
                    pkl_file.unlink()
                logger.info("Cleared local FAISS index files.")
            except Exception as e:
                logger.error(f"Error deleting local FAISS files: {str(e)}")
                # Fallback to directory deletion if necessary
                shutil.rmtree(self.db_dir, ignore_errors=True)
                self.db_dir.mkdir(parents=True, exist_ok=True)

    @log_execution_time
    def similarity_search(self, query: str, k: Optional[int] = None) -> List[Tuple[Document, float]]:
        """Performs similarity search with relevance scores on the FAISS index.
        
        Returns:
            List[Tuple[Document, float]]: List of (Document, score) tuples.
        """
        if self._db is None:
            logger.warning("Similarity search attempted on empty vector store.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_VECTOR_STORE_EMPTY
            )
            
        top_k = k or settings.TOP_K
        try:
            logger.info(f"Running similarity search for query: '{query}' with k={top_k}")
            results = self._db.similarity_search_with_score(query, k=top_k)
            return results
        except Exception as e:
            logger.error(f"Similarity search failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Vector store search failed: {str(e)}"
            )

_vector_store_cache = {}

def get_vector_store_for_user(embeddings: Embeddings, user_id: str) -> "VectorStoreService":
    """Retrieves or creates a cached VectorStoreService instance for a user."""
    global _vector_store_cache
    if user_id in _vector_store_cache:
        _vector_store_cache[user_id].embeddings = embeddings
        return _vector_store_cache[user_id]
    
    service = VectorStoreService(embeddings, user_id=user_id)
    _vector_store_cache[user_id] = service
    return service

# Global helper function for dependency injection
def get_vector_store_service(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    embeddings = Depends(get_embedding_service)
) -> VectorStoreService:
    from app.auth import verify_token
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
    if not token and x_user_id:
        token = x_user_id
        
    uid = "default"
    if token:
        try:
            user_info = verify_token(token)
            uid = user_info["uid"]
        except Exception:
            pass
    return get_vector_store_for_user(embeddings, user_id=uid)
