import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from app.database import get_db
from app.models.document import Document
from app.models.legal import LegalAnalysis
from app.models.research import ResearchSession

logger = logging.getLogger(__name__)
router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history(
    type: Optional[str] = Query(None, description="Filter by 'legal' or 'research'"),
    db: AsyncSession = Depends(get_db),
):
    """Return all past analyses, optionally filtered by type."""
    records = []

    if type != "research":
        # Fetch legal analyses joined with documents
        legal_result = await db.execute(
            select(LegalAnalysis, Document)
            .join(Document, LegalAnalysis.document_id == Document.id)
            .order_by(desc(LegalAnalysis.created_at))
            .limit(100)
        )
        for analysis, doc in legal_result.all():
            records.append({
                "id": f"legal_{analysis.id}",
                "type": "legal",
                "name": doc.filename,
                "date": analysis.created_at,
                "score": analysis.overall_risk_score,
                "status": analysis.status,
                "document_id": doc.id,
            })

    if type != "legal":
        # Fetch research sessions
        research_result = await db.execute(
            select(ResearchSession)
            .order_by(desc(ResearchSession.created_at))
            .limit(100)
        )
        for session in research_result.scalars().all():
            records.append({
                "id": f"research_{session.id}",
                "type": "research",
                "name": session.topic_description or f"Research Session ({session.paper_count} papers)",
                "date": session.created_at,
                "paper_count": session.paper_count,
                "status": session.status,
                "session_id": session.session_id,
            })

    # Sort by date descending
    records.sort(key=lambda r: r["date"] or "", reverse=True)
    return {"status": "complete", "count": len(records), "history": records}


@router.delete("/history/{record_id}")
async def delete_history(record_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a history record by its prefixed ID (e.g. 'legal_5' or 'research_3')."""
    parts = record_id.split("_", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid record ID format.")
    record_type, id_str = parts

    try:
        db_id = int(id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID.")

    if record_type == "legal":
        result = await db.execute(select(LegalAnalysis).where(LegalAnalysis.id == db_id))
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="Legal analysis not found.")
        await db.delete(record)
    elif record_type == "research":
        result = await db.execute(select(ResearchSession).where(ResearchSession.id == db_id))
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="Research session not found.")
        await db.delete(record)
    else:
        raise HTTPException(status_code=400, detail="Unknown record type.")

    return {"status": "deleted", "id": record_id}
