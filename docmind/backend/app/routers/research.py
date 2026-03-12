import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.research import ResearchSession, Paper, LiteratureReview, Insight
from app.services import pdf_parser, research_pipeline
from app.services.vector_store import delete_collection

logger = logging.getLogger(__name__)
router = APIRouter(tags=["research"])


class QueryRequest(BaseModel):
    question: str


@router.post("/upload")
async def upload_research_papers(
    files: List[UploadFile] = File(...),
    topic_description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Accept 1–15 PDFs. Create a research session, extract text, return session_id."""
    if len(files) < 1 or len(files) > 15:
        raise HTTPException(status_code=400, detail="Upload between 1 and 15 PDF files.")

    session_id = str(uuid.uuid4())
    session = ResearchSession(
        session_id=session_id,
        topic_description=topic_description or "",
        paper_count=len(files),
        status="pending",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    paper_list = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF.")
        file_bytes = await file.read()
        try:
            extracted = pdf_parser.extract_text(file_bytes, file.filename)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse {file.filename}: {e}")

        paper = Paper(
            session_id=session.id,
            filename=file.filename,
            page_count=extracted["total_pages"],
            raw_text=extracted["full_text"],
            chroma_indexed=False,
        )
        db.add(paper)
        paper_list.append({"filename": file.filename, "page_count": extracted["total_pages"]})

    await db.flush()
    return {
        "status": "pending",
        "session_id": session_id,
        "paper_count": len(files),
        "papers": paper_list,
    }


@router.get("/session/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get session status and list of uploaded papers."""
    result = await db.execute(
        select(ResearchSession)
        .where(ResearchSession.session_id == session_id)
        .options(selectinload(ResearchSession.papers))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "status": session.status,
        "session_id": session.session_id,
        "topic_description": session.topic_description,
        "paper_count": session.paper_count,
        "papers": [
            {"id": p.id, "filename": p.filename, "title": p.title, "page_count": p.page_count}
            for p in session.papers
        ],
    }


@router.post("/synthesize/{session_id}")
async def synthesize(session_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger the full 6-step research synthesis pipeline."""
    result = await db.execute(
        select(ResearchSession).where(ResearchSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status == "complete":
        raise HTTPException(status_code=409, detail="Synthesis already complete.")

    try:
        await research_pipeline.run_synthesis(session.id, db)
        return {"status": "complete", "session_id": session_id}
    except Exception as e:
        logger.error(f"Synthesis error for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {e}")


@router.get("/review/{session_id}")
async def get_review(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return the generated literature review."""
    result = await db.execute(
        select(ResearchSession).where(ResearchSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    review_result = await db.execute(
        select(LiteratureReview).where(LiteratureReview.session_id == session.id)
    )
    review = review_result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Literature review not yet generated.")
    return {
        "status": "complete",
        "review_text": review.review_text,
        "key_themes": review.key_themes,
        "created_at": review.created_at,
    }


@router.get("/contradictions/{session_id}")
async def get_contradictions(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return all detected contradiction pairs."""
    result = await db.execute(
        select(ResearchSession).where(ResearchSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    insights_result = await db.execute(
        select(Insight).where(Insight.session_id == session.id, Insight.type == "contradiction")
    )
    contradictions = insights_result.scalars().all()
    return {
        "status": "complete",
        "count": len(contradictions),
        "contradictions": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "paper_a_id": c.paper_a_id,
                "paper_b_id": c.paper_b_id,
                "severity": c.severity,
            }
            for c in contradictions
        ],
    }


@router.get("/gaps/{session_id}")
async def get_gaps(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return research gap analysis."""
    result = await db.execute(
        select(ResearchSession).where(ResearchSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    gaps_result = await db.execute(
        select(Insight).where(Insight.session_id == session.id, Insight.type == "gap")
    )
    gaps = gaps_result.scalars().all()
    return {
        "status": "complete",
        "count": len(gaps),
        "gaps": [
            {
                "id": g.id,
                "title": g.title,
                "description": g.description,
                "suggested_approach": g.suggested_approach,
            }
            for g in gaps
        ],
    }


@router.post("/query/{session_id}")
async def rag_query(session_id: str, body: QueryRequest, db: AsyncSession = Depends(get_db)):
    """RAG Chat: question → top-5 chunks → Claude answer + citations."""
    try:
        response = await research_pipeline.run_rag_query(session_id, body.question, db)
        return {"status": "complete", **response}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Delete session, papers, insights, and ChromaDB collection."""
    result = await db.execute(
        select(ResearchSession).where(ResearchSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    collection_name = f"research_{session.session_id}"
    delete_collection(collection_name)
    await db.delete(session)
    return {"status": "deleted", "session_id": session_id}
