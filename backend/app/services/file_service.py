import os
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from app.utils.logger import logger
from app.utils.helpers import sanitize_filename

class FileService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)

    def _init_dir(self):
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, file: UploadFile):
        """Validates file extension and size constraints."""
        # Validate extension
        filename = file.filename or ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PDF files are allowed. Extension .{ext} is not allowed."
            )
        
        # Validate file size
        file.file.seek(0, os.SEEK_END)
        size_bytes = file.file.tell()
        file.file.seek(0, os.SEEK_SET)
        
        if size_bytes > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum size limit of {settings.MAX_FILE_SIZE_MB}MB."
            )

    def save_file(self, file: UploadFile, doc_id: str) -> Path:
        """Saves UploadFile to upload directory with pre-pended doc_id."""
        self._init_dir()
        sanitized = sanitize_filename(file.filename or "document.pdf")
        unique_name = f"{doc_id}_{sanitized}"
        dest_path = self.upload_dir / unique_name
        
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logger.info(f"Saved uploaded file to {dest_path}")
        return dest_path

    def delete_file(self, file_path: str) -> bool:
        """Deletes file at path."""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Deleted physical file {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete physical file {file_path}: {str(e)}")
            return False

    def clear_all(self):
        """Deletes upload directory content and resets folder."""
        if self.upload_dir.exists():
            shutil.rmtree(self.upload_dir)
        self._init_dir()
        logger.info("Cleared all files in uploads directory.")

file_service = FileService()
