import logging
from typing import List, Dict, Any
import chromadb
from chromadb.utils import embedding_functions
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Persistent ChromaDB client
_chroma_client = chromadb.PersistentClient(path=settings.chroma_path)

# Lazy loading of sentence-transformers embeddings
_embedding_fn = None


def get_embedding_fn():
    """Lazily initialize the embedding function."""
    global _embedding_fn
    if _embedding_fn is None:
        logger.info("Initializing SentenceTransformerEmbeddingFunction (this may take a moment on first run)...")
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
    return _embedding_fn


def get_or_create_collection(name: str) -> chromadb.Collection:
    """Get or create a ChromaDB collection with local embeddings."""
    return _chroma_client.get_or_create_collection(
        name=name,
        embedding_function=get_embedding_fn(),
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(
    collection_name: str,
    chunks: List[str],
    metadatas: List[Dict[str, Any]],
) -> None:
    """
    Add text chunks to a ChromaDB collection.
    Generates IDs automatically from collection name + index.
    """
    if not chunks:
        return
    collection = get_or_create_collection(collection_name)
    ids = [f"{collection_name}_{i}" for i in range(len(chunks))]
    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids,
    )
    logger.info(f"Added {len(chunks)} chunks to collection '{collection_name}'")


def query(
    collection_name: str,
    query_text: str,
    n_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Query ChromaDB collection and return ranked results with metadata.
    Returns list of {text, metadata, distance}.
    """
    collection = get_or_create_collection(collection_name)
    count = collection.count()
    if count == 0:
        return []
    n = min(n_results, count)
    results = collection.query(
        query_texts=[query_text],
        n_results=n,
    )
    output = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    for doc, meta, dist in zip(docs, metas, distances):
        output.append({"text": doc, "metadata": meta, "distance": dist})
    return output


def delete_collection(collection_name: str) -> None:
    """Delete a ChromaDB collection (used for cleanup)."""
    try:
        _chroma_client.delete_collection(collection_name)
        logger.info(f"Deleted collection '{collection_name}'")
    except Exception as e:
        logger.warning(f"Could not delete collection '{collection_name}': {e}")
