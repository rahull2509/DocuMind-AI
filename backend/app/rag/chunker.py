import hashlib
from typing import List


def chunk_document(
    pages: List[dict],
    document_id: str,
    filename: str,
    chunk_size: int = 2800,
    chunk_overlap: int = 400,
) -> List[dict]:
    """
    Page-aware chunking. Each chunk stays within its page.
    Returns list of chunk dicts with deterministic chunk_ids.
    """
    chunks = []
    global_chunk_index = 0

    for page_data in pages:
        page_number = page_data["page"]
        text = page_data["text"]

        if not text:
            continue

        page_chunks = _sliding_window(text, chunk_size, chunk_overlap)

        for local_idx, chunk_text in enumerate(page_chunks):
            chunk_id = _make_chunk_id(document_id, page_number, local_idx)
            chunks.append({
                "document_id": document_id,
                "filename": filename,
                "page_number": page_number,
                "chunk_index": global_chunk_index,
                "chunk_id": chunk_id,
                "text": chunk_text,
            })
            global_chunk_index += 1

    return chunks


def _sliding_window(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Split text into overlapping chunks."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        if end >= len(text):
            break
        start += chunk_size - chunk_overlap
        if start >= len(text):
            break

    return chunks


def _make_chunk_id(document_id: str, page_number: int, chunk_index: int) -> str:
    """Generate a deterministic sha256-based chunk ID."""
    raw = f"{document_id}:{page_number}:{chunk_index}"
    return hashlib.sha256(raw.encode()).hexdigest()
