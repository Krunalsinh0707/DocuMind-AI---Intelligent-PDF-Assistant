import os
from typing import Dict, List, Optional
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, PyMongoError

from app.config import settings
from app.models.document_models import DocumentMetadata
from app.utils.logger import logger

class MongoDBManager:
    """Manages the MongoDB Atlas database connection, collections, indexing, and CRUD operations."""
    
    def __init__(self):
        self.uri = settings.MONGODB_URI
        self.db_name = settings.DATABASE_NAME
        self._client = None
        self._db = None
        self._connected = False

    def _init_db(self) -> None:
        """Initialize the connection pool and database indexes."""
        if self._connected:
            return
            
        try:
            if not self.uri:
                logger.warning("MONGODB_URI is not set. Falling back to local localhost/mock mode.")
                self.uri = "mongodb://localhost:27017"

            logger.info(f"Connecting to MongoDB database '{self.db_name}'...")
            # Use connection pooling and 5 second connection timeout
            self._client = MongoClient(
                self.uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            # Trigger server selection to force validation
            self._client.admin.command('ping')
            self._db = self._client[self.db_name]
            self._connected = True
            logger.info("Successfully connected to MongoDB Atlas database.")
            
            # Setup database indexes
            self._create_indexes()
        except ConnectionFailure as cf:
            logger.error(f"MongoDB connection failed: {str(cf)}. Falling back to local localhost/mock mode.")
            # Local fallback
            try:
                self._client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
                self._client.admin.command('ping')
                self._db = self._client[self.db_name]
                self._connected = True
                logger.info("Successfully connected to fallback local MongoDB instance.")
                self._create_indexes()
            except Exception as ex:
                logger.error(f"MongoDB fallback connection also failed: {str(ex)}")
                self._connected = False
        except Exception as e:
            logger.error(f"Unexpected error during MongoDB initialization: {str(e)}")
            self._connected = False

    def _create_indexes(self) -> None:
        """Create optimized indexes on all collections."""
        if not self._connected or self._db is None:
            return
            
        try:
            # Users Indexes
            self._db.users.create_index("google_id", unique=True, sparse=True)
            self._db.users.create_index("email", unique=True)
            
            # Documents Indexes
            self._db.documents.create_index([("user_id", ASCENDING), ("upload_timestamp", DESCENDING)])
            self._db.documents.create_index("id", unique=True)
            
            # Chat Sessions Indexes
            self._db.chat_sessions.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
            
            # Chat Messages Indexes
            self._db.chat_messages.create_index([("session_id", ASCENDING), ("timestamp", ASCENDING)])
            
            # Knowledge Base Metadata Indexes
            self._db.kb_metadata.create_index("user_id", unique=True)
            
            logger.info("MongoDB collections and indexes initialized successfully.")
        except PyMongoError as pe:
            logger.error(f"Error creating database indexes: {str(pe)}")

    @property
    def db(self):
        self._init_db()
        return self._db

    @property
    def users(self):
        return self.db.users if self.db is not None else None

    @property
    def documents(self):
        return self.db.documents if self.db is not None else None

    @property
    def chat_sessions(self):
        return self.db.chat_sessions if self.db is not None else None

    @property
    def chat_messages(self):
        return self.db.chat_messages if self.db is not None else None

    @property
    def kb_metadata(self):
        return self.db.kb_metadata if self.db is not None else None

    def get_all(self, user_id: str) -> List[DocumentMetadata]:
        """Retrieve all document metadata records for a specific user."""
        self._init_db()
        if not self._connected or self.documents is None:
            logger.warning("MongoDB is disconnected. Returning empty documents list.")
            return []
            
        try:
            cursor = self.documents.find({"user_id": user_id}).sort("upload_timestamp", DESCENDING)
            docs = []
            for doc_dict in cursor:
                # Remove mongo _id for pydantic compatibility
                doc_dict.pop("_id", None)
                # Convert upload_timestamp string back to datetime if necessary
                if "upload_timestamp" in doc_dict and isinstance(doc_dict["upload_timestamp"], str):
                    doc_dict["upload_timestamp"] = datetime.fromisoformat(doc_dict["upload_timestamp"])
                docs.append(DocumentMetadata(**doc_dict))
            return docs
        except Exception as e:
            logger.error(f"Error getting documents for user {user_id}: {str(e)}")
            return []

    def get_by_id(self, doc_id: str, user_id: str) -> Optional[DocumentMetadata]:
        """Retrieve a specific document's metadata by ID and user_id."""
        self._init_db()
        if not self._connected or self.documents is None:
            return None
            
        try:
            doc_dict = self.documents.find_one({"id": doc_id, "user_id": user_id})
            if not doc_dict:
                return None
            doc_dict.pop("_id", None)
            if "upload_timestamp" in doc_dict and isinstance(doc_dict["upload_timestamp"], str):
                doc_dict["upload_timestamp"] = datetime.fromisoformat(doc_dict["upload_timestamp"])
            return DocumentMetadata(**doc_dict)
        except Exception as e:
            logger.error(f"Error getting document {doc_id}: {str(e)}")
            return None

    def save(self, doc: DocumentMetadata, user_id: str) -> None:
        """Save or update document metadata for a specific user."""
        self._init_db()
        if not self._connected or self.documents is None:
            logger.warning("MongoDB is disconnected. Failed to save document.")
            return
            
        try:
            doc_dict = doc.model_dump()
            doc_dict["user_id"] = user_id
            # Ensure upload_timestamp is stored in iso format string or datetime
            if isinstance(doc_dict.get("upload_timestamp"), datetime):
                doc_dict["upload_timestamp"] = doc_dict["upload_timestamp"].isoformat()
            
            # Upsert document by ID
            self.documents.update_one(
                {"id": doc.id, "user_id": user_id},
                {"$set": doc_dict},
                upsert=True
            )
            logger.info(f"Saved document metadata in MongoDB: {doc.filename} (ID: {doc.id})")
        except Exception as e:
            logger.error(f"Error saving document {doc.id}: {str(e)}")

    def delete(self, doc_id: str, user_id: str) -> bool:
        """Delete document metadata by ID and user_id."""
        self._init_db()
        if not self._connected or self.documents is None:
            return False
            
        try:
            result = self.documents.delete_one({"id": doc_id, "user_id": user_id})
            if result.deleted_count > 0:
                logger.info(f"Deleted document metadata in MongoDB ID: {doc_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {str(e)}")
            return False

    def clear(self, user_id: str) -> None:
        """Clear all documents records for a specific user in MongoDB."""
        self._init_db()
        if not self._connected or self.documents is None:
            return
            
        try:
            self.documents.delete_many({"user_id": user_id})
            logger.info(f"Cleared document metadata for user {user_id}")
        except Exception as e:
            logger.error(f"Error clearing documents: {str(e)}")

# Global instance of connection manager
metadata_db = MongoDBManager()

# Alias for compatibility with other files
MetadataDB = MongoDBManager

def get_metadata_db() -> MongoDBManager:
    """Dependency to retrieve the document metadata database instance."""
    return metadata_db

