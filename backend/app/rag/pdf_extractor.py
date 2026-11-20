import re
from typing import List, Optional
import fitz  # PyMuPDF

# Regex pattern for identifying explicit numbered or standard section headings
_HEADING_PATTERN = re.compile(
    r"^(?:(?:[0-9]+(?:\.[0-9]+)*\.?|[A-Z]\.)\s+[A-Za-z0-9\s\-_–:&]{2,80}|"
    r"(?:Chapter|Section|Part|Appendix)\s+[0-9IVXLCDM]+(?::\s*[A-Za-z0-9\s\-_–:&]{2,80})?|"
    r"(?:Abstract|Introduction|Background|Background\s*&\s*Context|Methodology|Methods|Results|Discussion|Conclusion|References|Overview|Summary))\s*$",
    re.IGNORECASE,
)


def _detect_heading(line: str, is_large_or_bold: bool = False) -> Optional[str]:
    """
    Check if a line looks like an actual section heading or title.
    Requires matching explicit heading patterns, bold/larger typography,
    or all-caps section titles. Normal title-cased sentences are strictly rejected.
    """
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 90:
        return None

    # 1. Explicit section pattern match (e.g. "Section 2: Background & Context", "1. Introduction")
    if _HEADING_PATTERN.match(cleaned):
        return cleaned

    # 2. Typographical heading indicator: larger font or bold standalone short line without sentence punctuation
    if is_large_or_bold and len(cleaned) <= 60 and not cleaned.endswith((".", ",", ";", ":")):
        words = cleaned.split()
        if 1 <= len(words) <= 8:
            return cleaned

    # 3. All-caps standalone section title (e.g. "METHODOLOGY", "SYSTEM ARCHITECTURE")
    if len(cleaned) <= 45 and not cleaned.endswith((".", ",", ";", ":")):
        words = cleaned.split()
        if 1 <= len(words) <= 6 and cleaned.isupper() and any(c.isalpha() for c in cleaned):
            if len(cleaned) >= 4:
                return cleaned

    return None


def extract_pdf_pages(file_bytes: bytes, max_pages: int = 1000) -> List[dict]:
    """
    Extract text and tables from PDF bytes page by page, preserving page numbers and section headers.
    Returns list of {"page": int (1-based), "text": str, "section_title": str}.
    Skips empty pages. Raises ValueError for encrypted, empty, scanned/image-only, or oversized PDFs.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Failed to open PDF: {exc}") from exc

    try:
        # 1. Encryption check
        if doc.is_encrypted:
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
        total_extracted_chars = 0

        for i in range(total_pages):
            try:
                page = doc[i]
                page_section = current_section
                page_text_pieces = []

                # Extract structured text with font metadata using page dict
                page_dict = page.get_text("dict")
                blocks = page_dict.get("blocks", [])

                # Calculate median/typical body font size for this page
                font_sizes = []
                for b in blocks:
                    if b.get("type") == 0:  # Text block
                        for line in b.get("lines", []):
                            for span in line.get("spans", []):
                                s_text = span.get("text", "").strip()
                                if s_text and len(s_text) > 3:
                                    font_sizes.append(span.get("size", 10.0))
                body_font_size = sorted(font_sizes)[len(font_sizes) // 2] if font_sizes else 10.0

                for b in blocks:
                    if b.get("type") == 0:  # Text block
                        block_lines = []
                        for line in b.get("lines", []):
                            line_spans = line.get("spans", [])
                            line_text = "".join(s.get("text", "") for s in line_spans).strip()
                            if not line_text:
                                continue

                            # Check span typography (size >= 1.15 * body_size or bold flag)
                            is_large_or_bold = False
                            for span in line_spans:
                                span_size = span.get("size", 10.0)
                                span_flags = span.get("flags", 0)
                                font_name = span.get("font", "").lower()
                                if span_size >= body_font_size * 1.15 or (span_flags & 2 != 0) or "bold" in font_name:
                                    is_large_or_bold = True
                                    break

                            heading = _detect_heading(line_text, is_large_or_bold=is_large_or_bold)
                            if heading:
                                current_section = heading
                                page_section = heading

                            block_lines.append(line_text)

                        if block_lines:
                            page_text_pieces.append("\n".join(block_lines))

                # Also extract tables if present via PyMuPDF table finder
                try:
                    tabs = page.find_tables()
                    if tabs and tabs.tables:
                        for tab in tabs.tables:
                            df_lines = []
                            for row in tab.extract():
                                clean_row = [str(c or "").strip() for c in row]
                                if any(clean_row):
                                    df_lines.append(" | ".join(clean_row))
                            if df_lines:
                                page_text_pieces.append("\n[Table]\n" + "\n".join(df_lines))
                except Exception:
                    pass

                combined_text = "\n\n".join(page_text_pieces).strip()
                if combined_text:
                    total_extracted_chars += len(combined_text)
                    pages.append({
                        "page": i + 1,
                        "text": combined_text,
                        "section_title": page_section,
                    })

            except Exception:
                continue

    finally:
        doc.close()

    # Reject empty or scanned/image-only PDFs
    if not pages or total_extracted_chars == 0:
        raise ValueError(
            "PDF appears to be image-only or contains no extractable text; OCR is not available in this version."
        )

    return pages
