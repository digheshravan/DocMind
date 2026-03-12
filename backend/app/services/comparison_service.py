import logging
import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session, selectinload

from app.models.legal import LegalAnalysis, ClauseRisk
from app.services import claude_service

logger = logging.getLogger(__name__)

COMPARISON_SYSTEM_PROMPT = """You are a legal document comparison expert.
Your task is to analyze differences between two similar clauses from different documents.
Compare them specifically from the perspective of risk, favorability, and obligations.

Return ONLY a valid JSON object with these fields:
{
  "is_equivalent": true|false,
  "favorability": "DOCUMENT_A|DOCUMENT_B|NEUTRAL",
  "summary_of_difference": "One or two sentences explaining the key legal difference",
  "recommendation": "Specific advice on which version is safer"
}"""

OVERALL_SUMMARY_PROMPT = """You are a senior legal counsel. 
Given the comparison between two legal documents, provide a high-level executive summary of the differences.
Which document is better overall for the user? What are the key red flags in one relative to the other?

Return ONLY a valid JSON object:
{
  "executive_summary": "A 2-3 paragraph professional overview",
  "key_variations": ["variation 1", "variation 2", "variation 3"]
}"""

async def _compare_clause_pair(clause_a: Dict[str, Any], clause_b: Dict[str, Any]) -> Dict[str, Any]:
    """Use LLM to compare two paired clauses."""
    prompt = (
        f"COMPARE THESE TWO CLAUSES:\n\n"
        f"--- DOCUMENT A: {clause_a['clause_title']} ---\n{clause_a['clause_text']}\n\n"
        f"--- DOCUMENT B: {clause_b['clause_title']} ---\n{clause_b['clause_text']}"
    )
    
    try:
        comparison = await claude_service.analyze_json(COMPARISON_SYSTEM_PROMPT, prompt, max_tokens=1024)
        return {
            "clause_a": clause_a,
            "clause_b": clause_b,
            "comparison": comparison
        }
    except Exception as e:
        logger.error(f"Failed to compare clause pair: {e}")
        return {
            "clause_a": clause_a,
            "clause_b": clause_b,
            "comparison": {
                "is_equivalent": False,
                "favorability": "NEUTRAL",
                "summary_of_difference": "Comparison failed due to API error.",
                "recommendation": "Manual review required."
            }
        }

async def compare_documents(analysis_id_a: int, analysis_id_b: int, db: Session) -> Dict[str, Any]:
    """Compare two sets of analysis result and return paired differences."""
    
    # 1. Fetch both analyses with clauses
    ana_a = (
        db.query(LegalAnalysis)
        .filter(LegalAnalysis.id == analysis_id_a)
        .options(selectinload(LegalAnalysis.clauses))
        .first()
    )
    ana_b = (
        db.query(LegalAnalysis)
        .filter(LegalAnalysis.id == analysis_id_b)
        .options(selectinload(LegalAnalysis.clauses))
        .first()
    )
    
    if not ana_a or not ana_b:
        raise ValueError("One or both analysis IDs not found.")

    clauses_a = ana_a.clauses
    clauses_b = ana_b.clauses

    # 2. Semantic/Type-based Pairing
    pairs = []
    processed_b = set()

    for ca in clauses_a:
        match = None
        for cb in clauses_b:
            if cb.id in processed_b:
                continue
            if cb.clause_type == ca.clause_type:
                match = cb
                processed_b.add(cb.id)
                break
        
        if match:
            pairs.append((ca, match))

    # 3. Limited Concurrency comparison
    logger.info(f"Comparing {len(pairs)} clause pairs for {analysis_id_a} vs {analysis_id_b}")
    semaphore = asyncio.Semaphore(5)  # Limit to 5 parallel calls to avoid RPM limits
    
    async def limited_compare(pa, pb):
        async with semaphore:
            return await _compare_clause_pair(pa, pb)

    input_pairs = [
        (
            {"clause_title": p[0].clause_title, "clause_text": p[0].clause_text, "risk_level": p[0].risk_level, "clause_type": p[0].clause_type},
            {"clause_title": p[1].clause_title, "clause_text": p[1].clause_text, "risk_level": p[1].risk_level, "clause_type": p[1].clause_type}
        )
        for p in pairs
    ]
    
    pair_analyses = await asyncio.gather(*[limited_compare(p[0], p[1]) for p in input_pairs])

    # 4. Generate Overall Executive Summary
    comparison_digest = "\n\n".join([
        f"Clause: {p['clause_a']['clause_title']}\nDiff: {p['comparison']['summary_of_difference']}"
        for p in pair_analyses if p['comparison'].get('summary_of_difference')
    ])
    
    summary_prompt = (
        f"Compare Document A vs Document B.\n\n"
        f"Summary of Clause Diffs:\n{comparison_digest[:6000]}"
    )
    
    overall = None
    for attempt in range(2):
        try:
            overall = await claude_service.analyze_json(OVERALL_SUMMARY_PROMPT, summary_prompt, max_tokens=2048)
            break
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Overall summary attempt 1 failed, retrying... {e}")
                await asyncio.sleep(1)
                continue
            logger.error(f"Overall comparison summary failed after retries: {e}")
            overall = {
                "executive_summary": f"Could not generate automated summary. Please review the {len(pair_analyses)} clause-by-clause differences below for a complete analysis.",
                "key_variations": [],
                "winner": "Neither"
            }

    return {
        "overall": overall,
        "clause_comparisons": pair_analyses,
        "doc_a": {"id": ana_a.document_id, "score": ana_a.overall_risk_score},
        "doc_b": {"id": ana_b.document_id, "score": ana_b.overall_risk_score},
    }
