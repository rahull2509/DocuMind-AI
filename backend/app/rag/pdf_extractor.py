from typing import List, Optional
import fitz  # PyMuPDF


def extract_pdf_pages(file_bytes: bytes) -> List[dict]:
    """
    Extract text from PDF bytes page by page.
    Returns list of {"page": int (1-based), "text": str}.
    Skips empty pages. Raises ValueError if all pages are empty.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Failed to open PDF: {exc}") from exc

    pages = []
    try:
        for i in range(len(doc)):
            try:
                page = doc[i]
                text = page.get_text()
                if text and text.strip():
                    pages.append({"page": i + 1, "text": text.strip()})
            except Exception:
                # Skip pages that fail to extract
                continue
    finally:
        doc.close()

    if not pages:
        raise ValueError("PDF appears to be image-only; OCR is not available in this version")

    return pages
