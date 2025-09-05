# /rag.py

import os
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path
import numpy as np

# Core imports
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Document,
    StorageContext,
    Settings,
    ServiceContext
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.response_synthesizers import get_response_synthesizer

# Vector store
from llama_index.vector_stores.faiss import FaissVectorStore

# Embeddings and LLM
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

# Optional: for better observability
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OptimizedRAGSystem:
    """Production-ready RAG system with FAISS vector store"""
    
    def __init__(
        self,
        embed_model: str = "text-embedding-3-small",
        llm_model: str = "gpt-4o-mini",
        dimension: int = 1536,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        similarity_top_k: int = 5,
        faiss_index_type: str = "IVF",  # Options: "Flat", "IVF", "HNSW"
        enable_caching: bool = True
    ):
        """
        Initialize RAG system with optimized settings
        
        Args:
            embed_model: OpenAI embedding model name
            llm_model: OpenAI LLM model name
            dimension: Embedding dimension
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            similarity_top_k: Number of similar chunks to retrieve
            faiss_index_type: Type of FAISS index for different performance characteristics
            enable_caching: Enable response caching
        """
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.dimension = dimension
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.similarity_top_k = similarity_top_k
        self.faiss_index_type = faiss_index_type
        
        # Initialize components
        self._setup_llm_and_embeddings()
        self._setup_faiss_index()
        self.index = None
        self.query_engine = None
        
        # Cache for repeated queries
        self.cache = {} if enable_caching else None
        
    def _setup_llm_and_embeddings(self):
        """Configure LLM and embedding models with optimal settings"""
        # Set up embedding model
        self.embed_model_instance = OpenAIEmbedding(
            model=self.embed_model,
            embed_batch_size=100  # Batch for efficiency
        )
        
        # Set up LLM with optimized parameters
        self.llm = OpenAI(
            model=self.llm_model,
            temperature=0.1,  # Lower for factual accuracy
            max_tokens=2048,
            system_prompt=(
                "You are a precise assistant. Answer based on the provided context. "
                "If the context doesn't contain the answer, say so clearly."
            )
        )
        
        # Configure global settings
        Settings.embed_model = self.embed_model_instance
        Settings.llm = self.llm
        Settings.chunk_size = self.chunk_size
        Settings.chunk_overlap = self.chunk_overlap
        
    def _setup_faiss_index(self):
        """Initialize FAISS index with optimal configuration"""
        import faiss
        
        if self.faiss_index_type == "Flat":
            # Exact search - best accuracy, slower for large datasets
            faiss_index = faiss.IndexFlatL2(self.dimension)
            
        elif self.faiss_index_type == "IVF":
            # Inverted file index - good balance of speed and accuracy
            nlist = 100  # Number of clusters
            quantizer = faiss.IndexFlatL2(self.dimension)
            faiss_index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            
        elif self.faiss_index_type == "HNSW":
            # Hierarchical Navigable Small World - very fast, slight accuracy tradeoff
            faiss_index = faiss.IndexHNSWFlat(self.dimension, 32)
            
        else:
            raise ValueError(f"Unknown index type: {self.faiss_index_type}")
        
        self.vector_store = FaissVectorStore(faiss_index=faiss_index)
        logger.info(f"Initialized FAISS {self.faiss_index_type} index")
        
    def load_documents(
        self,
        data_path: str,
        file_extensions: Optional[List[str]] = None,
        recursive: bool = True,
        metadata_fn: Optional[callable] = None
    ) -> List[Document]:
        """
        Load and process documents efficiently
        
        Args:
            data_path: Path to documents directory
            file_extensions: List of file extensions to include
            recursive: Recursively read subdirectories
            metadata_fn: Function to extract metadata from files
        
        Returns:
            List of processed documents
        """
        # Load documents
        reader = SimpleDirectoryReader(
            data_path,
            recursive=recursive,
            required_exts=file_extensions,
            file_metadata=metadata_fn
        )
        
        documents = reader.load_data()
        logger.info(f"Loaded {len(documents)} documents from {data_path}")
        
        # Advanced: Add metadata enrichment
        for doc in documents:
            doc.metadata["char_count"] = len(doc.text)
            doc.metadata["word_count"] = len(doc.text.split())
            
        return documents
        
    def build_index(
        self,
        documents: List[Document],
        show_progress: bool = True
    ):
        """
        Build optimized FAISS index from documents
        
        Args:
            documents: List of documents to index
            show_progress: Show indexing progress
        """
        # Create storage context with FAISS
        storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )
        
        # Parse documents into nodes (chunks)
        parser = SentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
        # Build index with progress tracking
        self.index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            show_progress=show_progress,
            transformations=[parser]
        )
        
        # Train IVF index if applicable
        if self.faiss_index_type == "IVF":
            import faiss
            # Get the underlying FAISS index
            faiss_index = self.vector_store._faiss_index
            if not faiss_index.is_trained:
                # Generate sample embeddings for training
                sample_texts = [doc.text[:500] for doc in documents[:100]]
                embeddings = self.embed_model_instance.get_text_embedding_batch(
                    sample_texts, show_progress=False
                )
                training_data = np.array(embeddings).astype('float32')
                faiss_index.train(training_data)
                logger.info("Trained IVF index")
                
        logger.info(f"Built index with {len(documents)} documents")
        
    def setup_query_engine(
        self,
        similarity_cutoff: float = 0.7,
        response_mode: str = "compact",  # Options: "refine", "compact", "tree_summarize"
        streaming: bool = False
    ):
        """
        Configure optimized query engine
        
        Args:
            similarity_cutoff: Minimum similarity score for retrieved chunks
            response_mode: Response synthesis strategy
            streaming: Enable streaming responses
        """
        if not self.index:
            raise ValueError("Index not built. Call build_index() first.")
            
        # Configure retriever with optimizations
        retriever = VectorIndexRetriever(
            index=self.index,
            similarity_top_k=self.similarity_top_k,
        )
        
        # Add postprocessing to filter low-quality matches
        postprocessor = SimilarityPostprocessor(
            similarity_cutoff=similarity_cutoff
        )
        
        # Configure response synthesizer
        response_synthesizer = get_response_synthesizer(
            response_mode=response_mode,
            streaming=streaming
        )
        
        # Create query engine
        self.query_engine = RetrieverQueryEngine(
            retriever=retriever,
            node_postprocessors=[postprocessor],
            response_synthesizer=response_synthesizer
        )
        
        logger.info("Query engine configured")
        
    def query(
        self,
        question: str,
        verbose: bool = False
    ) -> Dict[str, Any]:
        """
        Query the RAG system with caching
        
        Args:
            question: User question
            verbose: Include source nodes in response
            
        Returns:
            Dictionary with answer and metadata
        """
        if not self.query_engine:
            raise ValueError("Query engine not configured. Call setup_query_engine() first.")
            
        # Check cache
        if self.cache is not None and question in self.cache:
            logger.info("Returning cached response")
            return self.cache[question]
            
        # Execute query
        response = self.query_engine.query(question)
        
        # Format response
        result = {
            "answer": str(response),
            "confidence": response.metadata.get("confidence", None) if hasattr(response, "metadata") else None
        }
        
        # Add source information if verbose
        if verbose and hasattr(response, "source_nodes"):
            result["sources"] = [
                {
                    "text": node.text[:200] + "...",
                    "score": node.score,
                    "metadata": node.metadata
                }
                for node in response.source_nodes
            ]
            
        # Cache result
        if self.cache is not None:
            self.cache[question] = result
            
        return result
        
    def save_index(self, persist_dir: str):
        """Save index to disk for reuse"""
        if not self.index:
            raise ValueError("No index to save")
            
        self.index.storage_context.persist(persist_dir=persist_dir)
        logger.info(f"Index saved to {persist_dir}")
        
    def load_index(self, persist_dir: str):
        """Load previously saved index"""
        from llama_index.core import load_index_from_storage
        
        storage_context = StorageContext.from_defaults(
            persist_dir=persist_dir,
            vector_store=self.vector_store
        )
        
        self.index = load_index_from_storage(storage_context)
        logger.info(f"Index loaded from {persist_dir}")


# Usage example
def main():
    """Example usage of the RAG system"""
    
    # Initialize system
    rag = OptimizedRAGSystem(
        embed_model="text-embedding-3-small",
        llm_model="gpt-4o-mini",
        chunk_size=512,
        chunk_overlap=50,
        similarity_top_k=5,
        faiss_index_type="IVF"  # Use IVF for datasets > 10k documents
    )
    
    # Load and index documents
    documents = rag.load_documents(
        data_path="./data",
        file_extensions=[".txt", ".pdf", ".md"],
        recursive=True
    )
    
    rag.build_index(documents, show_progress=True)
    
    # Setup query engine
    rag.setup_query_engine(
        similarity_cutoff=0.7,
        response_mode="compact"
    )
    
    # Query the system
    questions = [
        "What are the main benefits of RAG?",
        "How does FAISS improve search performance?",
        "Explain the document chunking strategy"
    ]
    
    for question in questions:
        result = rag.query(question, verbose=True)
        print(f"\nQ: {question}")
        print(f"A: {result['answer']}")
        
        if "sources" in result:
            print(f"Sources: {len(result['sources'])} chunks retrieved")
    
    # Save for later use
    rag.save_index("./storage")
    
    # Later: Load existing index
    # rag2 = OptimizedRAGSystem()
    # rag2.load_index("./storage")
    # rag2.setup_query_engine()


if __name__ == "__main__":
    # Set your OpenAI API key
    os.environ["OPENAI_API_KEY"] = "your-api-key-here"
    main()