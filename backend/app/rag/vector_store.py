import math
import os
import re
import sqlite3
import threading
from collections import Counter
from typing import Any, List, Optional, Dict
import numpy as np
from app.config import settings

COLLECTION_NAME = "documind_documents"

_client_instance: Any = None
_fallback_store_instance: Any = None
_client_lock = threading.Lock()
_use_fallback = False


def _stem(word: str) -> str:
    """Lightweight English suffix reduction for IR morphological alignment."""
    w = word.lower()
    for suffix in ("ations", "tion", "ment", "ness", "ing", "ly", "ed", "es", "s"):
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            return w[:-len(suffix)]
    return w


_BM25_STOP_WORDS = {
    "what", "should", "be", "in", "the", "a", "an", "and", "or", "to", "of", "for", "is", "it",
    "are", "was", "were", "this", "that", "these", "those", "how", "why", "where", "which"
}


def _compute_bm25_ranks(corpus_docs: List[Dict[str, Any]], query_text: str) -> Dict[str, int]:
    """
    Computes Okapi BM25 lexical rankings for candidate chunks.
    Incorporates both chunk text and section_title with morphological stemming.
    Returns mapping of chunk_id to 1-based rank.
    """
    if not query_text or not corpus_docs:
        return {}

    raw_q_words = re.findall(r"\w+", query_text.lower())
    q_words = [_stem(w) for w in raw_q_words if w not in _BM25_STOP_WORDS]
    if not q_words:
        q_words = [_stem(w) for w in raw_q_words]
    if not q_words:
        return {}

    tokenized_corpus = []
    for c in corpus_docs:
        full_text = f"{c.get('section_title', '')} {c.get('text', '')}".lower()
        doc_words = [_stem(w) for w in re.findall(r"\w+", full_text) if w not in _BM25_STOP_WORDS]
        tokenized_corpus.append(doc_words)

    corpus_size = len(tokenized_corpus)
    avgdl = sum(len(d) for d in tokenized_corpus) / max(1, corpus_size)

    # Document frequencies
    df = Counter()
    for doc in tokenized_corpus:
        for w in set(doc):
            df[w] += 1

    scores = []
    k1 = 1.5
    b = 0.75

    for idx, doc in enumerate(tokenized_corpus):
        doc_len = len(doc)
        freqs = Counter(doc)
        score = 0.0
        for w in q_words:
            if w in freqs:
                idf = math.log((corpus_size - df[w] + 0.5) / (df[w] + 0.5) + 1.0)
                tf = freqs[w]
                score += idf * (tf * (k1 + 1.0)) / (tf + k1 * (1.0 - b + b * (doc_len / avgdl)))
        scores.append((
            corpus_docs[idx]["chunk_id"],
            corpus_docs[idx].get("page_number", 1),
            score,
        ))

    # Stable tie-breaking: higher BM25 score first, then earlier page number first
    scores.sort(key=lambda x: (-round(x[2], 4), x[1]))
    return {chunk_id: rank + 1 for rank, (chunk_id, p, s) in enumerate(scores) if s > 0.0}


def _extract_content_features(text: str):
    """
    Extracts substantive vocabulary words and bullet/key points from chunk text,
    filtering out common running headers, page numbers, and synthetic watermarks.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    content_lines = []
    key_points = []
    in_kp = False
    for l in lines:
        lower_l = l.lower()
        if "key points" in lower_l or "key findings" in lower_l or "recommendations:" in lower_l:
            in_kp = True
            continue
        if in_kp:
            if l == "•" or l.startswith("-") or lower_l.startswith("qwik") or "1000" in lower_l:
                continue
            key_points.append(lower_l)
        else:
            if (
                not lower_l.startswith("1000-page")
                and not lower_l.startswith("sample pdf")
                and not "page " in lower_l
                and not lower_l.startswith("section ")
            ):
                content_lines.append(lower_l)

    words = set(re.findall(r"\w+", " ".join(content_lines)))
    kp_set = set(key_points)
    return words, kp_set


def _are_chunks_redundant(chunk_a: dict, chunk_b: dict) -> bool:
    """
    Detects whether two chunks contain identical or substantially duplicate factual information.
    Preserves chunks that provide genuinely distinct key points or different substantive content.
    """
    words_a, kp_a = _extract_content_features(chunk_a.get("text", ""))
    words_b, kp_b = _extract_content_features(chunk_b.get("text", ""))

    # If both chunks have key points / bullet points
    if kp_a and kp_b:
        kp_inter = kp_a.intersection(kp_b)
        kp_union = kp_a.union(kp_b)
        # If key points have < 70% overlap, they contain genuinely different requirements!
        if len(kp_union) > 0 and (len(kp_inter) / len(kp_union)) < 0.70:
            return False
        # If key points match, they are redundant duplicates
        return True

    # If neither chunk has key points, compare substantive body vocabulary overlap
    if words_a and words_b:
        w_inter = words_a.intersection(words_b)
        w_union = words_a.union(words_b)
        if len(w_union) > 0 and (len(w_inter) / len(w_union)) >= 0.88:
            return True

    # Fallback: check exact prefix snippet
    snip_a = chunk_a.get("text", "")[:120].strip()
    snip_b = chunk_b.get("text", "")[:120].strip()
    if snip_a and snip_a == snip_b:
        return True

    return False


def _deduplicate_candidates(
    candidates: List[dict],
    query_text: Optional[str] = None,
    top_k: int = 5,
) -> List[dict]:
    """
    Performs semantic and content deduplication over ranked retrieval candidates.
    Preserves the highest-ranking and most relevant source based on RRF and query alignment.
    Filters out redundant duplicate pages unless the query explicitly asks for occurrences across all pages.
    """
    if not candidates:
        return []

    q_lower = query_text.lower() if query_text else ""
    multi_triggers = [
        "all pages", "every page", "all occurrences", "repeated",
        "occurrences", "compare page", "compare section", "how many times",
        "list all", "both page", "both section",
    ]
    if any(t in q_lower for t in multi_triggers):
        return [{
            "chunk_id": item["chunk_id"],
            "document_id": item["document_id"],
            "filename": item["filename"],
            "page_number": item["page_number"],
            "chunk_index": item["chunk_index"],
            "section_title": item["section_title"],
            "text": item["text"],
            "distance": item["distance"],
        } for item in candidates[:top_k]]

    unique_results = []
    for item in candidates:
        duplicate = False
        for kept in unique_results:
            if _are_chunks_redundant(item, kept):
                duplicate = True
                break

        if not duplicate:
            unique_results.append({
                "chunk_id": item["chunk_id"],
                "document_id": item["document_id"],
                "filename": item["filename"],
                "page_number": item["page_number"],
                "chunk_index": item["chunk_index"],
                "section_title": item["section_title"],
                "text": item["text"],
                "distance": item["distance"],
            })

        if len(unique_results) >= top_k:
            break

    return unique_results


class SQLiteVectorStore:
    """
    Persistent, pure-Python vector store using SQLite and NumPy.
    Provides an exact drop-in fallback when native binary DLLs
    (such as chromadb_rust_bindings) are restricted by Windows Application Control policies.
    Supports Hybrid Retrieval combining dense cosine similarity and Okapi BM25 via Reciprocal Rank Fusion.
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
                    embedding BLOB NOT NULL,
                    section_title TEXT DEFAULT 'General'
                )
                """
            )
            try:
                conn.execute("ALTER TABLE vector_chunks ADD COLUMN section_title TEXT DEFAULT 'General'")
            except Exception:
                pass

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
                    (chunk_id, document_id, filename, page_number, chunk_index, text, embedding, section_title)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["chunk_id"],
                        c["document_id"],
                        c["filename"],
                        c["page_number"],
                        c["chunk_index"],
                        c["text"],
                        arr.tobytes(),
                        c.get("section_title", "General"),
                    ),
                )

    def search(
        self,
        query_embedding: List[float],
        top_k: int,
        document_ids: Optional[List[str]] = None,
        query_text: Optional[str] = None,
    ) -> List[dict]:
        with sqlite3.connect(self.db_path) as conn:
            if document_ids:
                placeholders = ",".join("?" for _ in document_ids)
                cursor = conn.execute(
                    f"SELECT chunk_id, document_id, filename, page_number, chunk_index, text, embedding, section_title FROM vector_chunks WHERE document_id IN ({placeholders})",
                    document_ids,
                )
            else:
                cursor = conn.execute(
                    "SELECT chunk_id, document_id, filename, page_number, chunk_index, text, embedding, section_title FROM vector_chunks"
                )
            rows = cursor.fetchall()

        if not rows:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            q_norm = 1.0

        candidates = []
        for row in rows:
            chunk_id, doc_id, filename, page_num, chunk_idx, text, emb_bytes = row[0:7]
            section_title = row[7] if len(row) > 7 and row[7] else "General"
            v = np.frombuffer(emb_bytes, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                v_norm = 1.0

            cosine_sim = float(np.dot(q_vec, v) / (q_norm * v_norm))
            cosine_dist = float(max(0.0, 1.0 - cosine_sim))

            candidates.append({
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "filename": filename,
                "page_number": page_num,
                "chunk_index": chunk_idx,
                "section_title": section_title,
                "text": text,
                "cosine_sim": cosine_sim,
                "distance": cosine_dist,
            })

        # Rank by dense cosine similarity (higher is better)
        candidates.sort(key=lambda x: x["cosine_sim"], reverse=True)
        dense_ranks = {c["chunk_id"]: rank + 1 for rank, c in enumerate(candidates)}

        # Rank by BM25 if query_text is available
        bm25_ranks = _compute_bm25_ranks(candidates, query_text) if query_text else {}

        # Reciprocal Rank Fusion (RRF)
        # Give balanced prominence to high-precision lexical matches (w_bm25=2.0, w_dense=1.0)
        w_bm25 = 2.0
        w_dense = 1.0
        for c in candidates:
            cid = c["chunk_id"]
            r_dense = dense_ranks.get(cid, 1000)
            r_bm25 = bm25_ranks.get(cid, 1000)
            c["rrf_score"] = (w_dense / (60.0 + r_dense)) + (w_bm25 / (60.0 + r_bm25))

        # Sort by RRF score descending, breaking ties with earlier page number
        candidates.sort(key=lambda x: (-x["rrf_score"], x.get("page_number", 1)))

        # Semantic and content deduplication over candidates
        return _deduplicate_candidates(candidates, query_text=query_text, top_k=top_k)

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
        if not os.path.exists(db_path) and os.path.exists(os.path.join("backend", settings.CHROMA_PATH, "vectors.db")):
            db_path = os.path.join("backend", settings.CHROMA_PATH, "vectors.db")
        _fallback_store_instance = SQLiteVectorStore(db_path)
    return _fallback_store_instance


def _get_client():
    """Return the client instance (for testing/compatibility)."""
    global _client_instance
    return _client_instance


def _get_collection():
    global _client_instance, _use_fallback
    if _use_fallback:
        return None

    if _client_instance is None:
        with _client_lock:
            if _client_instance is None:
                try:
                    import chromadb
                    from chromadb.config import Settings as ChromaSettings

                    os.makedirs(settings.CHROMA_PATH, exist_ok=True)
                    _client_instance = chromadb.PersistentClient(
                        path=settings.CHROMA_PATH,
                        settings=ChromaSettings(anonymized_telemetry=False, is_persistent=True),
                    )
                except Exception:
                    _use_fallback = True
                    return None

    try:
        return _client_instance.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    except Exception:
        _use_fallback = True
        return None


def add_chunks(chunks: List[dict], embeddings: List[List[float]]) -> None:
    """Add chunks and embeddings to vector store."""
    if not chunks:
        return

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
                    "section_title": c.get("section_title", "General"),
                    "chunk_index": c["chunk_index"],
                }
                for c in chunks
            ]
            coll.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
            return
        except Exception:
            pass

    _get_fallback_store().add_chunks(chunks, embeddings)


def search(
    query_embedding: List[float],
    top_k: int,
    document_ids: Optional[List[str]] = None,
    query_text: Optional[str] = None,
) -> List[dict]:
    """
    Search for nearest chunks with Hybrid Retrieval (Dense Vector + BM25 Lexical Ranking).
    Optionally filters by document_ids.
    """
    if document_ids is not None and len(document_ids) == 0:
        return []

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
                "n_results": min(50, top_k * 4),
                "include": ["documents", "metadatas", "distances"],
            }
            if where:
                kwargs["where"] = where

            results = coll.query(**kwargs)
            if results and results.get("documents") and results["documents"][0]:
                candidates = []
                ids = results.get("ids", [[]])[0]
                for idx, (doc, meta, dist) in enumerate(zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0],
                )):
                    chunk_id = ids[idx] if idx < len(ids) else f"cid_{idx}"
                    candidates.append({
                        "chunk_id": chunk_id,
                        "document_id": meta.get("document_id"),
                        "filename": meta.get("filename"),
                        "page_number": meta.get("page_number"),
                        "section_title": meta.get("section_title", "General"),
                        "chunk_index": meta.get("chunk_index"),
                        "text": doc,
                        "distance": dist,
                        "cosine_sim": 1.0 - dist,
                    })

                # Hybrid RRF reranking with BM25
                candidates.sort(key=lambda x: x["cosine_sim"], reverse=True)
                dense_ranks = {c["chunk_id"]: rank + 1 for rank, c in enumerate(candidates)}
                bm25_ranks = _compute_bm25_ranks(candidates, query_text) if query_text else {}

                w_bm25 = 2.0
                w_dense = 1.0
                for c in candidates:
                    cid = c["chunk_id"]
                    r_dense = dense_ranks.get(cid, 1000)
                    r_bm25 = bm25_ranks.get(cid, 1000)
                    c["rrf_score"] = (w_dense / (60.0 + r_dense)) + (w_bm25 / (60.0 + r_bm25))

                # Sort by RRF score descending, breaking ties with earlier page number
                candidates.sort(key=lambda x: (-x["rrf_score"], x.get("page_number", 1)))

                # Semantic and content deduplication over candidates
                return _deduplicate_candidates(candidates, query_text=query_text, top_k=top_k)
        except Exception:
            pass

    return _get_fallback_store().search(query_embedding, top_k, document_ids, query_text=query_text)


def delete_by_document_id(document_id: str) -> None:
    """Delete all vectors associated with the given document_id."""
    coll = _get_collection()
    if coll is not None:
        try:
            coll.delete(where={"document_id": {"$eq": document_id}})
        except Exception:
            pass

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
