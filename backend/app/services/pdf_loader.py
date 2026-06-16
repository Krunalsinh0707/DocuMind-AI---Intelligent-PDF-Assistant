from pathlib import Path
from typing import List
from langchain_core.documents import Document
from pypdf import PdfReader
from app.utils.logger import logger

class PDFLoaderService:
    def extract_text_with_metadata(self, file_path: Path) -> List[Document]:
        """Extracts text from a PDF file and returns a list of Document objects, one per page."""
        logger.info(f"Extracting text from PDF: {file_path}")
        documents = []
        try:
            reader = PdfReader(str(file_path))
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # Create LangChain Document
                doc = Document(
                    page_content=text,
                    metadata={
                        "source": file_path.name,
                        "page": i + 1,
                        "total_pages": len(reader.pages)
                    }
                )
                documents.append(doc)
            logger.info(f"Extracted {len(documents)} pages from {file_path.name}")
            return documents
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {str(e)}")
            raise e

def get_pdf_loader_service() -> PDFLoaderService:
    return PDFLoaderService()
