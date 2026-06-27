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
            
            # Search History Indexes
            self._db.search_history.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
            
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

    @property
    def search_history(self):
        return self.db.search_history if self.db is not None else None

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

    def save_search_history(self, user_id: str, query: str, session_id: Optional[str] = None, doc_id: Optional[str] = None, doc_name: Optional[str] = None, session_title: Optional[str] = None) -> str:
        """Saves a search query log to the search_history collection."""
        self._init_db()
        if not self._connected or self.search_history is None:
            return ""
        try:
            import uuid
            entry_id = f"search_{uuid.uuid4().hex[:16]}"
            doc = {
                "id": entry_id,
                "user_id": user_id,
                "query": query,
                "timestamp": datetime.utcnow().isoformat(),
                "session_id": session_id,
                "document_id": doc_id,
                "document_name": doc_name,
                "session_title": session_title
            }
            self.search_history.insert_one(doc)
            return entry_id
        except Exception as e:
            logger.error(f"Error saving search history: {str(e)}")
            return ""

    def get_search_history(self, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, document_id: Optional[str] = None, query: Optional[str] = None) -> List[dict]:
        """Retrieves filtered search history for a user, sorted by timestamp descending."""
        self._init_db()
        if not self._connected or self.search_history is None:
            return []
        try:
            filter_query = {"user_id": user_id}
            if start_date or end_date:
                time_filter = {}
                if start_date:
                    time_filter["$gte"] = start_date
                if end_date:
                    time_filter["$lte"] = f"{end_date}T23:59:59.999999" if "T" not in end_date else end_date
                filter_query["timestamp"] = time_filter
            if document_id:
                filter_query["document_id"] = document_id
            if query:
                filter_query["query"] = {"$regex": query, "$options": "i"}
            
            cursor = self.search_history.find(filter_query).sort("timestamp", DESCENDING)
            results = []
            for item in cursor:
                item.pop("_id", None)
                results.append(item)
            return results
        except Exception as e:
            logger.error(f"Error fetching search history: {str(e)}")
            return []

    def delete_search_history_entry(self, user_id: str, entry_id: str) -> bool:
        """Deletes a single search history entry if it belongs to the user."""
        self._init_db()
        if not self._connected or self.search_history is None:
            return False
        try:
            result = self.search_history.delete_one({"id": entry_id, "user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting search history entry {entry_id}: {str(e)}")
            return False

    def clear_search_history(self, user_id: str) -> None:
        """Clears all search history for a user."""
        self._init_db()
        if not self._connected or self.search_history is None:
            return
        try:
            self.search_history.delete_many({"user_id": user_id})
        except Exception as e:
            logger.error(f"Error clearing search history: {str(e)}")

    def update_user_profile(self, user_id: str, name: Optional[str] = None, email: Optional[str] = None, profile_picture: Optional[str] = None) -> Optional[dict]:
        """Updates user profile information in the users collection."""
        self._init_db()
        if not self._connected or self.users is None:
            return None
        try:
            update_data = {}
            if name is not None:
                update_data["name"] = name
            if email is not None:
                update_data["email"] = email
            if profile_picture is not None:
                update_data["profile_picture"] = profile_picture
            
            if not update_data:
                return self.get_user_profile(user_id)
                
            self.users.update_one({"id": user_id}, {"$set": update_data})
            return self.get_user_profile(user_id)
        except Exception as e:
            logger.error(f"Error updating user profile for {user_id}: {str(e)}")
            return None

    def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Gets user profile from the database."""
        self._init_db()
        if not self._connected or self.users is None:
            return None
        try:
            user = self.users.find_one({"id": user_id})
            if user:
                user.pop("_id", None)
            return user
        except Exception as e:
            logger.error(f"Error fetching profile: {str(e)}")
            return None

# Global instance of connection manager
metadata_db = MongoDBManager()

# Alias for compatibility with other files
MetadataDB = MongoDBManager

def get_metadata_db() -> MongoDBManager:
    """Dependency to retrieve the document metadata database instance."""
    return metadata_db

