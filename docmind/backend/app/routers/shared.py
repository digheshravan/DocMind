import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models.document import Document
from app.services import pdf_parser
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["shared"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a PDF, extract text, store in DB, return document_id."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save file to disk
    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Extract text
    try:
        extracted = pdf_parser.extract_text(file_bytes, file.filename)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {e}")

    # Save to database
    doc = Document(
        filename=file.filename,
        file_path=file_path,
        page_count=extracted["total_pages"],
        raw_text=extracted["full_text"],
        status="complete",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "status": "complete",
        "document_id": doc.id,
        "filename": doc.filename,
        "page_count": doc.page_count,
        "char_count": len(doc.raw_text or ""),
    }


@router.get("/documents/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db)):
    """Get document metadata and status."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "status": doc.status,
        "document_id": doc.id,
        "filename": doc.filename,
        "page_count": doc.page_count,
        "created_at": doc.created_at,
    }


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Ping DB, ChromaDB, and verify settings."""
    db_status = "error"
    chroma_status = "error"
    claude_status = "configured" if settings.groq_api_key else "missing"

    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    try:
        from app.services.vector_store import _chroma_client
        _chroma_client.heartbeat()
        chroma_status = "connected"
    except Exception as e:
        chroma_status = f"error: {e}"

    return {
        "status": "ok",
        "db": db_status,
        "chroma": chroma_status,
        "claude": claude_status,
    }
