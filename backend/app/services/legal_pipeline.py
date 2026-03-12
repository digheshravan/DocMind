import asyncio
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.services import claude_service, vector_store
from app.models.legal import LegalAnalysis, ClauseRisk

logger = logging.getLogger(__name__)

CLAUSE_EXTRACT_SYSTEM = """You are a legal document analysis AI.
Extract ALL clauses from the document provided.
Return ONLY a valid JSON array. No markdown, no explanation, no preamble.
Each clause must have these exact fields:
{
  "clause_title": "Short title for this clause",
  "clause_text": "Exact text of the clause",
  "clause_type": "liability|termination|payment|IP|privacy|dispute|penalty|other",
  "page_ref": null
}"""

CLAUSE_RISK_SYSTEM = """You are a legal risk classification AI.
Analyze the provided clause and return ONLY valid JSON. No markdown, no explanation.
Return exactly:
{
  "risk_level": "HIGH|MEDIUM|LOW",
  "risk_reason": "One sentence explaining why this risk level was assigned",
  "plain_english": "Plain-English explanation of what this clause means for the reader",
  "recommended_action": "Specific action the reader should consider taking"
}"""

SUMMARY_SYSTEM = """You are a legal document summarization AI.
Given a list of analyzed clauses, produce a document-level summary.
Return ONLY valid JSON. No markdown, no explanation.
Return exactly:
{
  "summary_paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "overall_risk_score": 75,
  "top_3_red_flags": ["Red flag 1", "Red flag 2", "Red flag 3"],
  "missing_protections": ["Missing protection 1", "Missing protection 2"]
}
overall_risk_score must be an integer from 0 (no risk) to 100 (extremely risky)."""

RAG_CHAT_SYSTEM = """You are an expert legal assistant. 
Your goal is to answer questions about a legal document based ONLY on the provided excerpts.
If the answer is not in the excerpts, state that you cannot find the information in the current document.
Be professional, precise, and cite clause titles where applicable.
"""


async def _classify_clause(clause: Dict[str, Any]) -> Dict[str, Any]:
    """Classify a single clause's risk. Called in parallel via asyncio.gather."""
    prompt = f"Classify the risk of this clause:\n\nTitle: {clause['clause_title']}\n\nText:\n{clause['clause_text']}"
    try:
        result = await claude_service.analyze_json(CLAUSE_RISK_SYSTEM, prompt, max_tokens=1024)
        return {**clause, **result}
    except Exception as e:
        logger.error(f"Risk classification failed for clause '{clause['clause_title']}': {e}")
        return {
            **clause,
            "risk_level": "LOW",
            "risk_reason": "Classification unavailable.",
            "plain_english": clause["clause_text"],
            "recommended_action": "Review with a legal professional.",
        }


async def run(
    document_text: str,
    analysis_id: int,
    db: Session,
) -> Dict[str, Any]:
    """
    Run the 3-step legal analysis pipeline.
    Step 1: Extract clauses
    Step 2: Classify all clauses in PARALLEL (asyncio.gather)
    Step 3: Generate document summary + risk score
    """
    analysis = db.get(LegalAnalysis, analysis_id)

    # ── Step 1: Clause Extraction ──────────────────────────────────────────
    logger.info(f"[Legal Pipeline] Step 1: Extracting clauses for analysis {analysis_id}")
    user_content = f"Extract all clauses from this legal document:\n\n{document_text[:60000]}"
    try:
        clauses: List[Dict] = await claude_service.analyze_json(
            CLAUSE_EXTRACT_SYSTEM, user_content, max_tokens=4096
        )
        if not isinstance(clauses, list):
            clauses = [clauses]
    except Exception as e:
        raise RuntimeError(f"Clause extraction failed: {e}")

    logger.info(f"[Legal Pipeline] Extracted {len(clauses)} clauses")

    # ── Step 2: Parallel Risk Classification ──────────────────────────────
    logger.info(f"[Legal Pipeline] Step 2: Classifying {len(clauses)} clauses in parallel")
    classified = await asyncio.gather(*[_classify_clause(c) for c in clauses])

    # Save clauses to DB
    for c in classified:
        clause_row = ClauseRisk(
            analysis_id=analysis_id,
            clause_title=c.get("clause_title", "Unnamed Clause"),
            clause_text=c.get("clause_text", ""),
            clause_type=c.get("clause_type", "other"),
            risk_level=c.get("risk_level", "OK"),
            risk_reason=c.get("risk_reason", ""),
            plain_english=c.get("plain_english", ""),
            recommended_action=c.get("recommended_action", ""),
            page_ref=c.get("page_ref"),
        )
        db.add(clause_row)
    db.flush()

    # ── Step 3: Document Summary ───────────────────────────────────────────
    logger.info(f"[Legal Pipeline] Step 3: Generating document summary")
    clauses_summary = "\n\n".join([
        f"[{c.get('risk_level', 'LOW')}] {c.get('clause_title', '')}: {c.get('plain_english', c.get('clause_text', ''))[:300]}"
        for c in classified
    ])
    summary_prompt = f"Summarize this legal document based on its analyzed clauses:\n\n{clauses_summary}"

    try:
        summary_data = await claude_service.analyze_json(SUMMARY_SYSTEM, summary_prompt, max_tokens=2048)
    except Exception as e:
        summary_data = {
            "summary_paragraphs": ["Analysis complete. Review individual clauses for details."],
            "overall_risk_score": 50,
            "top_3_red_flags": [],
            "missing_protections": [],
        }

    overall_score = summary_data.get("overall_risk_score", 50)
    summary_text = "\n\n".join(summary_data.get("summary_paragraphs", []))

    # Update analysis record
    analysis.overall_risk_score = float(overall_score)
    analysis.summary_text = summary_text
    analysis.red_flags = summary_data.get("top_3_red_flags", [])
    analysis.missing_protections = summary_data.get("missing_protections", [])
    analysis.status = "complete"
    db.flush()

    # ── Step 4: Vector Ingestion for RAG ────────────────────────────────
    logger.info(f"[Legal Pipeline] Step 4: Chunking & Embedding full text")
    # Simple chunking by paragraph/length
    paragraphs = [p.strip() for p in document_text.split('\n\n') if len(p.strip()) > 50]
    chunks = []
    current_chunk = ""
    for p in paragraphs:
        if len(current_chunk) + len(p) < 2000:
            current_chunk += "\n\n" + p
        else:
            chunks.append(current_chunk.strip())
            current_chunk = p
    if current_chunk:
        chunks.append(current_chunk.strip())

    metadatas = [{"analysis_id": analysis_id, "doc_id": analysis.document_id} for _ in chunks]
    collection_name = f"legal_analysis_{analysis_id}"
    vector_store.add_chunks(collection_name, chunks, metadatas)

    logger.info(f"[Legal Pipeline] Complete. Score: {overall_score}")
    return {
        "overall_risk_score": overall_score,
        "summary_text": summary_text,
        "red_flags": analysis.red_flags,
        "missing_protections": analysis.missing_protections,
        "clause_count": len(classified),
    }

async def run_legal_query(analysis_id: int, question: str, db: Session) -> Dict[str, Any]:
    """Perform RAG query against a legal document's vector embeddings."""
    collection_name = f"legal_analysis_{analysis_id}"
    
    context_results = vector_store.query(collection_name, question, n_results=5)
    context_text = "\n\n---\n\n".join([r['text'] for r in context_results])
    
    if not context_text:
        return {"answer": "I don't have enough context from this document to answer that question accurately.", "citations": []}

    prompt = (
        f"USER QUESTION: {question}\n\n"
        f"DOCUMENT EXCERPTS:\n{context_text}"
    )
    
    answer = await claude_service.analyze(RAG_CHAT_SYSTEM, prompt, max_tokens=1024)
    
    return {
        "answer": answer,
        "citations": [r['metadata'] for r in context_results]
    }
