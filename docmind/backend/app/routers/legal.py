import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document
from app.models.legal import LegalAnalysis, ClauseRisk
from app.services import legal_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(tags=["legal"])


@router.post("/analyze/{doc_id}")
async def analyze_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger the 3-step legal analysis pipeline for a document."""
    # Fetch document
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.raw_text:
        raise HTTPException(status_code=422, detail="Document has no extracted text.")

    # Check if analysis already exists
    existing = await db.execute(
        select(LegalAnalysis).where(LegalAnalysis.document_id == doc_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Analysis already exists. Delete it first.")

    # Create placeholder analysis record
    analysis = LegalAnalysis(document_id=doc_id, status="processing")
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    try:
        result_data = await legal_pipeline.run(doc.raw_text, analysis.id, db)
        return {"status": "complete", "analysis_id": analysis.id, **result_data}
    except Exception as e:
        analysis.status = "error"
        await db.flush()
        logger.error(f"Legal pipeline error for doc {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.get("/analysis/{doc_id}")
async def get_analysis(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Return full legal analysis including all clauses."""
    result = await db.execute(
        select(LegalAnalysis)
        .where(LegalAnalysis.document_id == doc_id)
        .options(selectinload(LegalAnalysis.clauses))
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this document.")

    return {
        "status": analysis.status,
        "analysis_id": analysis.id,
        "document_id": doc_id,
        "overall_risk_score": analysis.overall_risk_score,
        "summary_text": analysis.summary_text,
        "red_flags": analysis.red_flags,
        "missing_protections": analysis.missing_protections,
        "clauses": [
            {
                "id": c.id,
                "clause_title": c.clause_title,
                "clause_text": c.clause_text,
                "clause_type": c.clause_type,
                "risk_level": c.risk_level,
                "risk_reason": c.risk_reason,
                "plain_english": c.plain_english,
                "recommended_action": c.recommended_action,
                "page_ref": c.page_ref,
            }
            for c in analysis.clauses
        ],
    }


@router.get("/clauses/{doc_id}")
async def get_clauses(
    doc_id: int,
    risk_level: str = Query(None, description="Filter by HIGH/MEDIUM/LOW/OK"),
    db: AsyncSession = Depends(get_db),
):
    """List clauses for a document, optionally filtered by risk level."""
    aresult = await db.execute(
        select(LegalAnalysis).where(LegalAnalysis.document_id == doc_id)
    )
    analysis = aresult.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found.")

    query = select(ClauseRisk).where(ClauseRisk.analysis_id == analysis.id)
    if risk_level:
        query = query.where(ClauseRisk.risk_level == risk_level.upper())

    cresult = await db.execute(query)
    clauses = cresult.scalars().all()

    return {
        "status": "complete",
        "count": len(clauses),
        "clauses": [
            {
                "id": c.id,
                "clause_title": c.clause_title,
                "clause_type": c.clause_type,
                "risk_level": c.risk_level,
                "plain_english": c.plain_english,
                "recommended_action": c.recommended_action,
                "page_ref": c.page_ref,
            }
            for c in clauses
        ],
    }


@router.get("/summary/{doc_id}")
async def get_summary(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Get plain-English summary and overall risk score."""
    result = await db.execute(
        select(LegalAnalysis).where(LegalAnalysis.document_id == doc_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found.")
    return {
        "status": analysis.status,
        "overall_risk_score": analysis.overall_risk_score,
        "summary_text": analysis.summary_text,
        "red_flags": analysis.red_flags,
        "missing_protections": analysis.missing_protections,
    }


@router.delete("/analysis/{doc_id}")
async def delete_analysis(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a legal analysis (including all clauses via cascade)."""
    result = await db.execute(
        select(LegalAnalysis).where(LegalAnalysis.document_id == doc_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found.")
    await db.delete(analysis)
    return {"status": "deleted", "document_id": doc_id}
