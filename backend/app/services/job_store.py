import asyncio
from typing import Dict, Optional

class JobStore:
    def __init__(self):
        self._jobs: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def create_job(self, job_id: str, filename: str) -> None:
        """Initializes a new job entry in the store."""
        async with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "filename": filename,
                "status": "processing",
                "progress": 0,
                "message": "Queued for background indexing...",
                "chunk_count": 0
            }

    async def update_job(
        self,
        job_id: str,
        status: str,
        progress: int,
        message: str,
        chunk_count: int = 0
    ) -> None:
        """Updates status, progress, message, and chunk count for a job."""
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update({
                    "status": status,
                    "progress": progress,
                    "message": message,
                    "chunk_count": chunk_count
                })

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Retrieves job information by job_id."""
        async with self._lock:
            return self._jobs.get(job_id)

job_store = JobStore()
