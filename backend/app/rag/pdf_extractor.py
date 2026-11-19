import re
from typing import List, Optional
import fitz  # PyMuPDF

# Regex pattern for identifying section headings or titles in documents
_HEADING_PATTERN = re.compile(
    r"^(?:(?:[0-9]+(?:\.[0-9]+)*|[A-Z]\.)\s+[A-Za-z0-9\s\-_–:]{2,80}|"
    r"(?:Chapter|Section|Part|Appendix)\s+[0-9IVXLCDM]+(?::\s*[A-Za-z0-9\s\-_–]{2,80})?|"
    r"(?:Abstract|Introduction|Background|Methodology|Methods|Results|Discussion|Conclusion|References|Overview|Summary))\s*$",
    re.IGNORECASE,
)


def _detect_heading(line: str) -> Optional[str]:
    """Check if a line looks like a section heading or title."""
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 90:
        return None
    # Check if matches common heading patterns
    if _HEADING_PATTERN.match(cleaned):
        return cleaned
    # Check if short, capitalized/title-cased, and doesn't end with sentence punctuation
    if len(cleaned) <= 60 and not cleaned.endswith((".", ",", ";", ":")):
        words = cleaned.split()
        if 1 <= len(words) <= 8 and (cleaned.isupper() or cleaned.istitle()):
            return cleaned
    return None


def extract_pdf_pages(file_bytes: bytes, max_pages: int = 1000) -> List[dict]:
    """
    Extract text from PDF bytes page by page, preserving page numbers and section headers.
    Returns list of {"page": int (1-based), "text": str, "section_title": str}.
    Skips empty pages. Raises ValueError for encrypted, empty, or oversized PDFs.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Failed to open PDF: {exc}") from exc

    try:
        # 1. Encryption check
        if doc.is_encrypted:
            # Try decrypting with empty password
            if not doc.authenticate(""):
                raise ValueError("PDF is password-encrypted and cannot be opened.")

        # 2. Maximum page limit check
        total_pages = len(doc)
        if total_pages > max_pages:
            raise ValueError(
                f"PDF exceeds maximum page limit of {max_pages} pages (has {total_pages} pages)."
            )

        pages = []
        current_section = "General"

        for i in range(total_pages):
            try:
                page = doc[i]
                blocks = page.get_text("blocks")
                page_text_pieces = []
                page_section = current_section

                for b in blocks:
                    # b: (x0, y0, x1, y1, text, block_no, block_type)
                    # block_type 0 is text
                    if len(b) > 4 and b[6] == 0:
                        block_text = b[4].strip()
                        if not block_text:
                            continue

                        # Inspect lines in block for section headings
                        lines = [ln.strip() for ln in block_text.splitlines() if ln.strip()]
                        for line in lines:
                            heading = _detect_heading(line)
                            if heading:
                                current_section = heading
                                page_section = heading

                        page_text_pieces.append(block_text)

                combined_text = "\n\n".join(page_text_pieces).strip()
                if combined_text:
                    pages.append({
                        "page": i + 1,
                        "text": combined_text,
                        "section_title": page_section,
                    })

            except Exception:
                # Continue extracting remaining readable pages
                continue

    finally:
        doc.close()

    if not pages:
        raise ValueError(
            "PDF appears to be image-only or contains no extractable text; OCR is not available in this version."
        )

    return pages
