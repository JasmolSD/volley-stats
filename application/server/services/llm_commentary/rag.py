"""Production-ready RAG system with FAISS vector store."""

import asyncio
import logging
import os
from pathlib import Path
from typing import Any
import time

import faiss
from dotenv import load_dotenv
from llama_index.core import (
    Document,
    Settings,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
)
from llama_index.core.base.response.schema import Response
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core import SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.huggingface_api import HuggingFaceInferenceAPI
from llama_index.vector_stores.faiss import FaissVectorStore

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS: dict[str, int] = {
    "sentence-transformers/all-MiniLM-L6-v2": 384,
    "sentence-transformers/all-mpnet-base-v2": 768,
    "BAAI/bge-small-en-v1.5": 384,
    "BAAI/bge-base-en-v1.5": 768,
    "BAAI/bge-large-en-v1.5": 1024,
}

FAISS_INDEX_FILENAME = "faiss_index.bin"


class RAGSystem:
    """Production-ready RAG system with FAISS vector store."""

    def __init__(
        self,
        embed_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        llm_model: str = "HuggingFaceTB/SmolLM3-3B",
        dimension: int | None = None,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        similarity_top_k: int = 5,
        faiss_index_type: str = "Flat",
        enable_caching: bool = True,
    ):
        self.embed_model = embed_model
        self.llm_model = llm_model
        self.dimension = dimension or self._get_embedding_dimension(embed_model)
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.similarity_top_k = similarity_top_k
        self.faiss_index_type = faiss_index_type

        self._setup_models()

        self.vector_store: FaissVectorStore | None = None
        self.index: VectorStoreIndex | None = None
        self.query_engine: RetrieverQueryEngine | None = None
        self.cache: dict[str, dict[str, Any]] | None = {} if enable_caching else None

    def _get_embedding_dimension(self, model_name: str) -> int:
        """Get embedding dimension for a model, with fallback detection."""
        if model_name in EMBEDDING_DIMENSIONS:
            return EMBEDDING_DIMENSIONS[model_name]

        logger.info(f"Detecting embedding dimension for {model_name}")
        temp_embed = HuggingFaceEmbedding(model_name=model_name)
        test_embedding = temp_embed.get_text_embedding("test")
        return len(test_embedding)

    def _setup_models(self) -> None:
        """Configure LLM and embedding models."""
        self.embed_model_instance = HuggingFaceEmbedding(
            model_name=self.embed_model,
            embed_batch_size=100,
        )

        self.llm = HuggingFaceInferenceAPI(
            model=self.llm_model,
            token=os.getenv("HF_TOKEN"),
            provider="auto",
            temperature=0.1,
            max_new_tokens=512,
        )

        Settings.embed_model = self.embed_model_instance
        Settings.llm = self.llm
        Settings.chunk_size = self.chunk_size
        Settings.chunk_overlap = self.chunk_overlap

    def _create_faiss_index(self) -> faiss.Index:
        """Create a new FAISS index based on configured type."""
        if self.faiss_index_type == "Flat":
            return faiss.IndexFlatL2(self.dimension)
        if self.faiss_index_type == "HNSW":
            return faiss.IndexHNSWFlat(self.dimension, 32)
        raise ValueError(f"Unknown index type: {self.faiss_index_type}")

    async def load_documents(
        self,
        data_path: str | None = None,
        file_extensions: list[str] | None = None,
        recursive: bool = True,
    ) -> list[Document]:
        """Load documents from a directory."""
        if data_path is None:
            data_path = str(Path(__file__).parent / "data")

        reader = SimpleDirectoryReader(
            data_path,
            recursive=recursive,
            required_exts=file_extensions,
        )

        documents = await reader.aload_data()
        logger.info(f"Loaded {len(documents)} documents from {data_path}")
        return documents

    async def build_index(
        self,
        documents: list[Document],
        show_progress: bool = True,
    ) -> None:
        """Build FAISS index from documents."""
        faiss_index = self._create_faiss_index()
        self.vector_store = FaissVectorStore(faiss_index=faiss_index)
        logger.info(f"Initialized FAISS {self.faiss_index_type} index (dim={self.dimension})")

        storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        parser = SentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )

        loop = asyncio.get_running_loop()
        self.index = await loop.run_in_executor(
            None,
            lambda: VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context,
                show_progress=show_progress,
                transformations=[parser],
            ),
        )
        logger.info(f"Built index with {len(documents)} documents")

    def setup_query_engine(
        self,
        similarity_cutoff: float = 0.7,
        response_mode: str = "compact",
        streaming: bool = False,
    ) -> None:
        """Configure the query engine."""
        if self.index is None:
            raise ValueError("Index not built. Call build_index() first.")

        retriever = VectorIndexRetriever(
            index=self.index,
            similarity_top_k=self.similarity_top_k,
        )

        self.query_engine = RetrieverQueryEngine(
            retriever=retriever,
            node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=similarity_cutoff)],
            response_synthesizer=get_response_synthesizer(
                response_mode=response_mode,  # type: ignore[arg-type]
                streaming=streaming,
            ),
        )
        logger.info("Query engine configured")

    async def query(self, question: str, verbose: bool = False) -> dict[str, Any]:
        """Query the RAG system."""
        if self.query_engine is None:
            raise ValueError("Query engine not configured. Call setup_query_engine() first.")

        if self.cache is not None and question in self.cache:
            logger.info("Returning cached response")
            return self.cache[question]

        response: Response = await self.query_engine.aquery(question)  # type: ignore
        result: dict[str, Any] = {"answer": str(response)}

        if verbose and hasattr(response, "source_nodes"):
            result["sources"] = [
                {
                    "text": node.text[:200] + "..." if len(node.text) > 200 else node.text,
                    "score": node.score,
                    "metadata": node.metadata,
                }
                for node in response.source_nodes
            ]

        if self.cache is not None:
            self.cache[question] = result

        return result

    async def batch_query(
        self,
        questions: list[str],
        verbose: bool = False,
    ) -> list[dict[str, Any]]:
        """Query multiple questions concurrently."""
        return await asyncio.gather(*(self.query(q, verbose) for q in questions))

    def save_index(self, persist_dir: str) -> None:
        """Save index and FAISS vector store to disk."""
        if self.index is None or self.vector_store is None:
            raise ValueError("No index to save")

        persist_path = Path(persist_dir)
        persist_path.mkdir(parents=True, exist_ok=True)

        # Save llama_index storage (docstore, index_store)
        self.index.storage_context.persist(persist_dir=persist_dir)

        # Save FAISS index separately
        faiss_path = persist_path / FAISS_INDEX_FILENAME
        faiss.write_index(self.vector_store._faiss_index, str(faiss_path))

        logger.info(f"Index saved to {persist_dir}")

    def load_index(self, persist_dir: str) -> None:
        """Load previously saved index and FAISS vector store."""
        persist_path = Path(persist_dir)
        faiss_path = persist_path / FAISS_INDEX_FILENAME

        if not faiss_path.exists():
            raise FileNotFoundError(f"FAISS index not found at {faiss_path}")

        # Load FAISS index from disk
        faiss_index = faiss.read_index(str(faiss_path))
        self.vector_store = FaissVectorStore(faiss_index=faiss_index)
        logger.info(f"Loaded FAISS index with {faiss_index.ntotal} vectors")

        # Load llama_index storage with the loaded FAISS vector store
        storage_context = StorageContext.from_defaults(
            persist_dir=persist_dir,
            vector_store=self.vector_store,
        )
        self.index = load_index_from_storage(storage_context)  # type: ignore
        logger.info(f"Index loaded from {persist_dir}")

    @staticmethod
    def _index_exists(persist_dir: str) -> bool:
        """Check if a valid index exists at the given path."""
        path = Path(persist_dir)
        required_files = ["docstore.json", "index_store.json", FAISS_INDEX_FILENAME]
        return path.exists() and all((path / f).exists() for f in required_files)

    @classmethod
    async def create(
        cls,
        persist_dir: str | None = None,
        data_path: str | None = None,
        file_extensions: list[str] | None = None,
        similarity_cutoff: float = 0.7,
        response_mode: str = "compact",
        **kwargs: Any,
    ) -> "RAGSystem":
        """Factory method to create and initialize a RAGSystem."""
        instance = cls(**kwargs)

        if persist_dir and cls._index_exists(persist_dir):
            logger.info(f"Loading existing index from {persist_dir}")
            instance.load_index(persist_dir)
        else:
            logger.info("Building new index from documents")
            documents = await instance.load_documents(
                data_path=data_path,
                file_extensions=file_extensions,
            )
            await instance.build_index(documents)

            if persist_dir:
                instance.save_index(persist_dir)

        instance.setup_query_engine(
            similarity_cutoff=similarity_cutoff,
            response_mode=response_mode,
        )
        return instance


async def main() -> None:
    """Example usage of the RAG system."""
    rag = await RAGSystem.create(
        persist_dir="./application/server/services/llm_commentary/storage",
        chunk_size=512,
        chunk_overlap=50,
        similarity_top_k=5,
        faiss_index_type="Flat",
        file_extensions=[".txt", ".pdf", ".md"],
        similarity_cutoff=0.7,
        response_mode="compact",
    )

    questions = [
        "Why is Yuji Nishida good? Give details.",
        "Why is Luciano so good?",
        "What are some ways I can improve myself to get to Luciano and Nishida's level?",
    ]

    results = await rag.batch_query(questions, verbose=True)

    for question, result in zip(questions, results):
        print(f"\nQ: {question}")
        print(f"A: {result['answer']}")
        if "sources" in result:
            print(f"Sources: {len(result['sources'])} chunks retrieved")


if __name__ == "__main__":
    logger.info("Waiting 5 seconds to prevent API timeouts")
    time.sleep(5)
    logger.info("Done waiting! Running RAG...")
    asyncio.run(main())