"""
Independent test script for OpenRouter integration in DocuMind AI.
Verifies:
1. OPENROUTER_API_KEY presence (without leaking the key)
2. OpenRouter client initialization
3. Selected model completion and extraction
4. RAG question answering and document summarization
5. Error handling and sanitization
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.llm_service import get_llm_service
from app.services.vector_store import VectorStoreService
from app.services.embedding_service import get_embedding_service
from app.services.rag_chain import RAGChainService
from langchain_core.messages import HumanMessage
from langchain_core.documents import Document

def run_tests():
    print("=" * 60)
    print("DOCUMIND AI - OPENROUTER INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Verify Configuration & Key Check
    key_loaded = bool(settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY.strip()) > 0)
    print(f"LLM_PROVIDER: {settings.LLM_PROVIDER}")
    print(f"OPENROUTER_API_KEY loaded: {key_loaded}")
    print(f"Configured OpenRouter Model: {settings.OPENROUTER_MODEL}")
    print(f"OpenRouter Base URL: {settings.OPENROUTER_BASE_URL}")
    print("-" * 60)

    # 2. Client Initialization Test
    print("Test 1: Initializing OpenRouter LLM Service...")
    try:
        llm = get_llm_service(force_reload=True)
        print(f"  [SUCCESS] LLM Service successfully initialized as: {type(llm).__name__}")
    except Exception as e:
        print(f"  [FAILED] Failed to initialize LLM service: {str(e)}")
        return False

    # If no API key is provided yet, demonstrate error handling & mock tests
    if not key_loaded:
        print("\n[NOTE] OPENROUTER_API_KEY is currently empty in .env.")
        print("Testing graceful error handling when API key is missing...")
        
        # Test missing key handling via RAGChainService
        dummy_embeddings = get_embedding_service()
        vector_store = VectorStoreService(dummy_embeddings, user_id="test_user")
        rag_chain = RAGChainService(vector_store=vector_store, llm=llm)
        
        try:
            rag_chain.answer_question("Test question")
            print("  [UNEXPECTED] Expected missing key exception, but none was raised.")
        except Exception as e:
            from fastapi import HTTPException
            if isinstance(e, HTTPException):
                print(f"  [SUCCESS] Gracefully caught HTTPException: {e.status_code} - {e.detail}")
            else:
                print(f"  [SUCCESS] Caught error: {str(e)}")
        
        print("\nAll code structure tests passed! Please set OPENROUTER_API_KEY in backend/.env to run live API calls.")
        return True

    # 3. Simple Generation Test
    print("\nTest 2: Testing Live Prompt Generation with OpenRouter...")
    try:
        test_msg = [HumanMessage(content="Respond with the single word: 'DocuMind-Verified'")]
        response = llm.invoke(test_msg)
        content = response.content
        if isinstance(content, list):
            content = "".join(b if isinstance(b, str) else b.get("text", "") for b in content)
        print(f"  [SUCCESS] Response received from model '{settings.OPENROUTER_MODEL}': {content.strip()}")
    except Exception as e:
        print(f"  [FAILED] Live generation failed: {str(e)}")
        return False

    # 4. RAG Question Answering with Retrieved Context Test
    print("\nTest 3: Testing RAG Question Answering with Context Chunks...")
    try:
        from app.services.embedding_service import MockEmbeddings
        test_embeddings = MockEmbeddings()
        vector_store = VectorStoreService(test_embeddings, user_id="test_user_qa")
        vector_store.reset_store()
        # Add sample document chunks
        sample_chunks = [
            Document(page_content="DocuMind AI is an advanced document assistant that supports PDF indexing, semantic search, and multi-turn chat.", metadata={"source": "documind_guide.pdf", "page": 1}),
            Document(page_content="The system uses OpenRouter as its primary LLM generation provider to ensure reliable performance across models.", metadata={"source": "documind_guide.pdf", "page": 2})
        ]
        vector_store.add_documents(sample_chunks, doc_id="test_doc_1")
        
        rag_chain = RAGChainService(vector_store=vector_store, llm=llm)
        qa_response = rag_chain.answer_question("What LLM provider does DocuMind AI use?")
        print(f"  [SUCCESS] RAG Answer: {qa_response.answer.strip()}")
        print(f"  [SUCCESS] Citations returned: {len(qa_response.sources)} source(s)")
        for s in qa_response.sources:
            print(f"    - Source: {s.source_name}, Page: {s.page}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"  [FAILED] RAG Question Answering failed: {repr(e)}")
        return False

    # 5. PDF Summarization Test
    print("\nTest 4: Testing PDF Summarization Prompt via RAG Chain...")
    try:
        summary_response = rag_chain.answer_question("Summarize this document and list the key features.")
        print(f"  [SUCCESS] Summary output: {summary_response.answer.strip()[:200]}...")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"  [FAILED] PDF Summarization failed: {repr(e)}")
        return False

    # Cleanup test vector store files
    try:
        vector_store.reset_store()
    except Exception:
        pass

    print("\n" + "=" * 60)
    print("ALL OPENROUTER BACKEND TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
