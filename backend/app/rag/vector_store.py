import os
import sqlite3
import threading
from typing import Any, List, Optional
import numpy as np
from app.config import settings

COLLECTION_NAME = "documind_documents"

_client_instance: Any = None
_fallback_store_instance: Any = None
_client_lock = threading.Lock()
_use_fallback = False


class SQLiteVectorStore:
    """
    Persistent, pure-Python vector store using SQLite and NumPy.
    Provides an exact drop-in fallback when native binary DLLs
    (such as chromadb_rust_bindings) are restricted by Windows Application Control policies.
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    embedding BLOB NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS ix_vector_chunks_doc_id ON vector_chunks (document_id)"
            )

    def add_chunks(self, chunks: List[dict], embeddings: List[List[float]]) -> None:
        with sqlite3.connect(self.db_path) as conn:
            for c, emb in zip(chunks, embeddings):
                arr = np.array(emb, dtype=np.float32)
                conn.execute(
                    """
                    INSERT OR REPLACE INTO vector_chunks 
                    (chunk_id, document_id, filename, page_number, chunk_index, text, embedding)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["chunk_id"],
                        c["document_id"],
                        c["filename"],
                        c["page_number"],
                        c["chunk_index"],
                        c["text"],
                        arr.tobytes(),
                    ),
                )

    def search(
        self,
        query_embedding: List[float],
        top_k: int,
        document_ids: Optional[List[str]] = None,
    ) -> List[dict]:
        with sqlite3.connect(self.db_path) as conn:
            if document_ids:
                placeholders = ",".join("?" for _ in document_ids)
                cursor = conn.execute(
                    f"SELECT chunk_id, document_id, filename, page_number, chunk_index, text, embedding FROM vector_chunks WHERE document_id IN ({placeholders})",
                    document_ids,
                )
            else:
                cursor = conn.execute(
                    "SELECT chunk_id, document_id, filename, page_number, chunk_index, text, embedding FROM vector_chunks"
                )
            rows = cursor.fetchall()

        if not rows:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            q_norm = 1.0

        scored = []
        for row in rows:
            chunk_id, doc_id, filename, page_num, chunk_idx, text, emb_bytes = row
            v = np.frombuffer(emb_bytes, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                v_norm = 1.0

            cosine_sim = float(np.dot(q_vec, v) / (q_norm * v_norm))
            cosine_dist = float(max(0.0, 1.0 - cosine_sim))

            scored.append(
                {
                    "text": text,
                    "document_id": doc_id,
                    "filename": filename,
                    "page_number": page_num,
                    "chunk_index": chunk_idx,
                    "distance": cosine_dist,
                }
            )

        scored.sort(key=lambda x: x["distance"])
        return scored[:top_k]

    def delete_by_document_id(self, document_id: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM vector_chunks WHERE document_id = ?", (document_id,))

    def get_collection_count(self) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM vector_chunks")
            return cursor.fetchone()[0]


def _get_fallback_store() -> SQLiteVectorStore:
    global _fallback_store_instance
    if _fallback_store_instance is None:
        db_path = os.path.join(settings.CHROMA_PATH, "vectors.db")
        _fallback_store_instance = SQLiteVectorStore(db_path)
    return _fallback_store_instance


def _get_collection():
    global _client_instance, _use_fallback
    if _use_fallback:
        return None

    if _client_instance is None:
        with _client_lock:
            if _client_instance is None and not _use_fallback:
                try:
                    import chromadb
                    client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
                    coll = client.get_or_create_collection(
                        name=COLLECTION_NAME,
                        metadata={"hnsw:space": "cosine"},
                    )
                    # verify collection is operational
                    coll.count()
                    _client_instance = coll
                except Exception as err:
                    # Native DLL blocked or ChromaDB unavailable; fallback to pure Python vector store
                    _use_fallback = True
                    return None

    return _client_instance


def _get_client():
    """Alias for backwards compatibility and test patching."""
    return _get_collection()


def add_chunks(chunks: List[dict], embeddings: List[List[float]]) -> None:
    """Upsert chunks with their embeddings into the vector collection."""
    coll = _get_collection()
    if coll is not None:
        try:
            ids = [c["chunk_id"] for c in chunks]
            documents = [c["text"] for c in chunks]
            metadatas = [
                {
                    "document_id": c["document_id"],
                    "filename": c["filename"],
                    "page_number": c["page_number"],
                    "chunk_index": c["chunk_index"],
                }
                for c in chunks
            ]
            coll.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
            return
        except Exception:
            pass

    # Fallback store
    _get_fallback_store().add_chunks(chunks, embeddings)


def search(
    query_embedding: List[float],
    top_k: int,
    document_ids: Optional[List[str]] = None,
) -> List[dict]:
    """Search for nearest chunks. Optionally filter by document_ids."""
    coll = _get_collection()
    if coll is not None:
        try:
            where = None
            if document_ids:
                if len(document_ids) == 1:
                    where = {"document_id": {"$eq": document_ids[0]}}
                else:
                    where = {"document_id": {"$in": document_ids}}

            kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": top_k,
                "include": ["documents", "metadatas", "distances"],
            }
            if where:
                kwargs["where"] = where

            results = coll.query(**kwargs)
            output = []
            if results and results.get("documents"):
                for doc, meta, dist in zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0],
                ):
                    output.append(
                        {
                            "text": doc,
                            "document_id": meta.get("document_id"),
                            "filename": meta.get("filename"),
                            "page_number": meta.get("page_number"),
                            "chunk_index": meta.get("chunk_index"),
                            "distance": dist,
                        }
                    )
                return output
        except Exception:
            pass

    # Fallback store
    return _get_fallback_store().search(query_embedding, top_k, document_ids)


def delete_by_document_id(document_id: str) -> None:
    """Delete all vectors associated with the given document_id."""
    coll = _get_collection()
    if coll is not None:
        try:
            coll.delete(where={"document_id": {"$eq": document_id}})
        except Exception:
            pass

    # Always ensure purged in fallback as well
    _get_fallback_store().delete_by_document_id(document_id)


def get_collection_count() -> int:
    """Return total number of vectors in the collection."""
    coll = _get_collection()
    if coll is not None:
        try:
            return coll.count()
        except Exception:
            pass

    return _get_fallback_store().get_collection_count()
