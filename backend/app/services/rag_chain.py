from typing import List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.services.vector_store import VectorStoreService
from app.models.chat_models import ChatResponse, SourceCitation
from app.utils.logger import logger

class RAGChainService:
    def __init__(self, vector_store: VectorStoreService, llm: BaseChatModel):
        self.vector_store = vector_store
        self.llm = llm

    def answer_question(self, question: str, history: Optional[List[List[str]]] = None) -> ChatResponse:
        """Runs QA over the retrieved context using conversational history."""
        logger.info(f"RAG Chain: Answering question: '{question}'")
        
        # 1. Retrieve context
        try:
            results = self.vector_store.similarity_search(question)
        except Exception as e:
            logger.warning(f"Failed to search vector store: {str(e)}. Proceeding without context.")
            results = []
            
        context_str = ""
        sources = []
        
        for doc, score in results:
            context_str += f"\n---\nDocument: {doc.metadata.get('source', 'unknown')}\nPage: {doc.metadata.get('page', 'unknown')}\nContent: {doc.page_content}\n"
            sources.append(SourceCitation(
                source_name=doc.metadata.get("source", "unknown"),
                content=doc.page_content,
                score=float(score) if score is not None else None,
                page=doc.metadata.get("page")
            ))
            
        # 2. Build system message with context
        system_prompt = (
            "You are DocuMind AI, an intelligent document research assistant. "
            "Analyze the retrieved document context below and answer the user's question. "
            "If the retrieved context does not contain the information needed, "
            "answer to the best of your knowledge but clarify that the answer is not in the documents.\n\n"
            f"Retrieved Context:\n{context_str}"
        )
        
        messages = [SystemMessage(content=system_prompt)]
        
        # 3. Add conversation history
        if history:
            for user_msg, assistant_msg in history:
                messages.append(HumanMessage(content=user_msg))
                messages.append(AIMessage(content=assistant_msg))
                
        # 4. Add current query
        messages.append(HumanMessage(content=question))
        
        # 5. Call LLM
        try:
            response = self.llm.invoke(messages)
            answer = response.content
        except Exception as e:
            logger.error(f"LLM execution failed: {str(e)}")
            raise e
            
        return ChatResponse(
            answer=answer,
            sources=sources
        )
