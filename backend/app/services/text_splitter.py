from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings
from app.utils.logger import logger

class TextSplitterService:
    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len
        )

    def split_pages(self, documents: List[Document]) -> List[Document]:
        """Splits LangChain Document pages into smaller textual chunks."""
        logger.info(f"Splitting {len(documents)} document pages...")
        chunks = self.splitter.split_documents(documents)
        logger.info(f"Generated {len(chunks)} chunks from document splitting.")
        return chunks

def get_text_splitter_service() -> TextSplitterService:
    return TextSplitterService()
