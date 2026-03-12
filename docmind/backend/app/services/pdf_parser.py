import io
import pdfplumber
from typing import List, Dict, Any


def extract_text(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text from PDF bytes page by page.
    Returns: {filename, total_pages, pages:[{page_num, text}], full_text}
    """
    pages = []
    full_text_parts = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            text = text.strip()
            pages.append({"page_num": i, "text": text})
            full_text_parts.append(text)

    full_text = "\n\n".join(full_text_parts)

    return {
        "filename": filename,
        "total_pages": total_pages,
        "pages": pages,
        "full_text": full_text,
    }


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
    """
    Chunk text into overlapping windows.
    """
    if not text:
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= text_len:
            break
        start = end - overlap

    return chunks
