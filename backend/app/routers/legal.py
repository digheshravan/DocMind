import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.document import Document
from app.models.legal import LegalAnalysis, ClauseRisk
from app.services import legal_pipeline, comparison_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["legal"])


class CompareRequest(BaseModel):
    analysis_id_a: int
    analysis_id_b: int


@router.post("/compare")
async def compare_legal_documents(body: CompareRequest, db: Session = Depends(get_db)):
    """Compare two legal analyses and return detailed differences."""
    try:
        result = await comparison_service.compare_documents(
            body.analysis_id_a, body.analysis_id_b, db
        )
        return {"status": "complete", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")


@router.post("/analyze/{doc_id}")
async def analyze_document(doc_id: int, db: Session = Depends(get_db)):
    """Trigger the 3-step legal analysis pipeline for a document."""
    # Fetch document
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.raw_text:
        raise HTTPException(status_code=422, detail="Document has no extracted text.")

    # Check if analysis already exists
    existing = db.query(LegalAnalysis).filter(LegalAnalysis.document_id == doc_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Analysis already exists. Delete it first.")

    # Create placeholder analysis record
    analysis = LegalAnalysis(document_id=doc_id, status="processing")
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    try:
        result_data = await legal_pipeline.run(doc.raw_text, analysis.id, db)
        db.commit() # Ensure pipeline changes are saved
        return {"status": "complete", "analysis_id": analysis.id, **result_data}
    except Exception as e:
        analysis.status = "error"
        db.commit()
        logger.error(f"Legal pipeline error for doc {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.get("/analysis/{doc_id}")
def get_analysis(doc_id: int, db: Session = Depends(get_db)):
    """Return full legal analysis including all clauses."""
    analysis = (
        db.query(LegalAnalysis)
        .filter(LegalAnalysis.document_id == doc_id)
        .options(selectinload(LegalAnalysis.clauses))
        .first()
    )
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
def get_clauses(
    doc_id: int,
    risk_level: str = Query(None, description="Filter by HIGH/MEDIUM/LOW/OK"),
    db: Session = Depends(get_db),
):
    """List clauses for a document, optionally filtered by risk level."""
    analysis = db.query(LegalAnalysis).filter(LegalAnalysis.document_id == doc_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found.")

    query = db.query(ClauseRisk).filter(ClauseRisk.analysis_id == analysis.id)
    if risk_level:
        query = query.filter(ClauseRisk.risk_level == risk_level.upper())

    clauses = query.all()

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
def get_summary(doc_id: int, db: Session = Depends(get_db)):
    """Get plain-English summary and overall risk score."""
    analysis = db.query(LegalAnalysis).filter(LegalAnalysis.document_id == doc_id).first()
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
def delete_analysis(doc_id: int, db: Session = Depends(get_db)):
    """Delete a legal analysis (including all clauses via cascade)."""
    analysis = db.query(LegalAnalysis).filter(LegalAnalysis.document_id == doc_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found.")
    
    # Cleanup vector store
    try:
        from app.services import vector_store
        vector_store.delete_collection(f"legal_analysis_{analysis.id}")
    except Exception as e:
        logger.warning(f"Failed to delete vector collection for analysis {analysis.id}: {e}")

    db.delete(analysis)
    db.commit()
    return {"status": "deleted", "document_id": doc_id}


class QueryRequest(BaseModel):
    question: str


@router.post("/query/{analysis_id}")
async def query_legal_analysis(
    analysis_id: int, body: QueryRequest, db: Session = Depends(get_db)
):
    """Answer questions about a specific legal document using RAG."""
    try:
        result = await legal_pipeline.run_legal_query(analysis_id, body.question, db)
        return result
    except Exception as e:
        logger.error(f"Legal query error: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")
