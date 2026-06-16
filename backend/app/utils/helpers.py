import os
import re
import uuid

def generate_unique_id() -> str:
    """Generates a unique string identifier."""
    return uuid.uuid4().hex

def get_file_size_mb(file_path: str) -> float:
    """Gets file size in Megabytes."""
    if not os.path.exists(file_path):
        return 0.0
    return os.path.getsize(file_path) / (1024 * 1024)

def sanitize_filename(filename: str) -> str:
    """Sanitizes file name to prevent path traversal vulnerability."""
    # Strip directory path
    base_name = os.path.basename(filename)
    # Remove any non-alphanumeric/dot/underscore/dash characters
    sanitized = re.sub(r"[^\w\.\-]", "_", base_name)
    return sanitized
