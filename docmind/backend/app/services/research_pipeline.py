import asyncio
import logging
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.services import claude_service, vector_store, pdf_parser
from app.models.research import ResearchSession, Paper, LiteratureReview, Insight

logger = logging.getLogger(__name__)

METADATA_SYSTEM = """You are a research paper metadata extractor.
Given the first portion of a research paper, extract its metadata.
Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Full paper title",
  "authors": "Author names as a comma-separated string",
  "abstract": "The abstract or a brief summary if no abstract is present"
}"""

REVIEW_SYSTEM = """You are an academic literature review AI.
Given a collection of research paper excerpts, write a structured literature review.
Return ONLY valid JSON, no markdown, no explanation:
{
  "introduction": "Introduction paragraph",
  "key_themes": ["theme 1", "theme 2", "theme 3"],
  "methodology": "Methodology overview paragraph",
  "findings": "Key findings paragraph",
  "conclusion": "Conclusion paragraph"
}"""

CONTRADICTION_SYSTEM = """You are an academic contradiction detector.
Compare claims from two research paper excerpts.
Return ONLY valid JSON, no markdown, no explanation:
{
  "contradiction_found": true,
  "paper_a_claim": "What paper A claims",
  "paper_b_claim": "What paper B claims",
  "severity": "HIGH|MEDIUM|LOW",
  "explanation": "Why this is a contradiction and why it matters"
}"""

GAP_SYSTEM = """You are a research gap analysis AI.
Given multiple paper abstracts, identify 4 to 6 research gaps in this field.
Return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "title": "Short gap title",
    "description": "Detailed description of the gap",
    "gap_type": "methodological|empirical|theoretical|applied",
    "suggested_approach": "How future researchers could address this gap"
  }
]"""

RAG_SYSTEM = """You are a research assistant answering questions about academic papers.
Answer the question using only the provided context excerpts.
Cite specific papers using [Paper Title, p.X] format inline.
Return ONLY valid JSON, no markdown wrapper:
{
  "answer": "Your detailed answer with inline citations",
  "citations": [
    {"paper": "Paper title or filename", "page": null, "excerpt": "Quoted excerpt used"}
  ]
}"""


async def _extract_paper_metadata(paper_text: str, filename: str) -> Dict[str, Any]:
    """Extract title, authors, abstract from first 500 characters of paper."""
    snippet = paper_text[:500]
    prompt = f"Extract metadata from this research paper opening (filename: {filename}):\n\n{snippet}"
    try:
        return await claude_service.analyze_json(METADATA_SYSTEM, prompt, max_tokens=512)
    except Exception as e:
        logger.warning(f"Metadata extraction failed for {filename}: {e}")
        return {"title": filename, "authors": "Unknown", "abstract": snippet[:200]}


async def run_synthesis(session_db_id: int, db: Session) -> None:
    """
    Run the 6-step research synthesis pipeline.
    """
    session = db.get(ResearchSession, session_db_id)
    if not session:
        return
    session.status = "processing"
    db.flush()

    # Load all papers
    papers = db.query(Paper).filter(Paper.session_id == session_db_id).all()
    collection_name = f"research_{session.session_id}"

    # ── Step 1: Chunk + Embed + Store ────────────────────────────────────
    logger.info(f"[Research Pipeline] Step 1: Ingesting {len(papers)} papers")
    for paper in papers:
        if not paper.raw_text or paper.chroma_indexed:
            continue
        chunks = pdf_parser.chunk_text(paper.raw_text, chunk_size=1500, overlap=200)
        metadatas = [
            {"paper_id": paper.id, "filename": paper.filename, "chunk_index": i}
            for i in range(len(chunks))
        ]
        vector_store.add_chunks(collection_name, chunks, metadatas)
        paper.chroma_indexed = True
    db.flush()

    # ── Step 2: Metadata Extraction (parallel) ───────────────────────────
    logger.info(f"[Research Pipeline] Step 2: Extracting metadata")
    meta_tasks = [
        _extract_paper_metadata(p.raw_text or "", p.filename)
        for p in papers
    ]
    metas = await asyncio.gather(*meta_tasks)
    for paper, meta in zip(papers, metas):
        paper.title = meta.get("title", paper.filename)
        paper.authors = meta.get("authors", "")
        paper.abstract = meta.get("abstract", "")
    db.flush()

    # ── Step 3: Literature Review ─────────────────────────────────────────
    logger.info(f"[Research Pipeline] Step 3: Generating literature review")
    top_chunks = vector_store.query(collection_name, session.topic_description or "research overview", n_results=20)
    context = "\n\n---\n\n".join([c["text"] for c in top_chunks])
    review_prompt = f"Topic: {session.topic_description}\n\nPaper excerpts:\n{context[:20000]}"
    try:
        review_data = await claude_service.analyze_json(REVIEW_SYSTEM, review_prompt, max_tokens=4096)
    except Exception as e:
        logger.error(f"Literature review failed: {e}")
        review_data = {"introduction": "Review generation failed.", "key_themes": [], "methodology": "", "findings": "", "conclusion": ""}

    review_text = "\n\n".join([
        f"## Introduction\n{review_data.get('introduction', '')}",
        f"## Methodology\n{review_data.get('methodology', '')}",
        f"## Findings\n{review_data.get('findings', '')}",
        f"## Conclusion\n{review_data.get('conclusion', '')}",
    ])
    lit_review = LiteratureReview(
        session_id=session_db_id,
        review_text=review_text,
        key_themes=review_data.get("key_themes", []),
    )
    db.add(lit_review)
    db.flush()

    # ── Step 4: Contradiction Detection (pairwise) ───────────────────────
    logger.info(f"[Research Pipeline] Step 4: Detecting contradictions")
    if len(papers) >= 2:
        for i in range(len(papers)):
            for j in range(i + 1, len(papers)):
                pa, pb = papers[i], papers[j]
                pa_chunks = vector_store.query(collection_name, pa.abstract or pa.filename, n_results=3)
                pb_chunks = vector_store.query(collection_name, pb.abstract or pb.filename, n_results=3)
                pa_text = " ".join([c["text"] for c in pa_chunks])[:2000]
                pb_text = " ".join([c["text"] for c in pb_chunks])[:2000]
                contradiction_prompt = (
                    f"Paper A ({pa.title}):\n{pa_text}\n\n"
                    f"Paper B ({pb.title}):\n{pb_text}"
                )
                try:
                    c_data = await claude_service.analyze_json(CONTRADICTION_SYSTEM, contradiction_prompt, max_tokens=1024)
                    if c_data.get("contradiction_found"):
                        insight = Insight(
                            session_id=session_db_id,
                            type="contradiction",
                            title=f"{pa.title} vs {pb.title}",
                            description=c_data.get("explanation", ""),
                            paper_a_id=pa.id,
                            paper_b_id=pb.id,
                            severity=c_data.get("severity", "MEDIUM"),
                        )
                        db.add(insight)
                except Exception as e:
                    logger.warning(f"Contradiction check failed for papers {pa.id} vs {pb.id}: {e}")
        db.flush()

    # ── Step 5: Gap Mapping ───────────────────────────────────────────────
    logger.info(f"[Research Pipeline] Step 5: Gap mapping")
    abstracts = "\n\n".join([
        f"Paper: {p.title}\nAbstract: {p.abstract}" for p in papers if p.abstract
    ])
    gap_prompt = f"Identify research gaps based on these paper abstracts:\n\n{abstracts[:10000]}"
    try:
        gaps = await claude_service.analyze_json(GAP_SYSTEM, gap_prompt, max_tokens=2048)
        if isinstance(gaps, list):
            for gap in gaps:
                g = Insight(
                    session_id=session_db_id,
                    type="gap",
                    title=gap.get("title", "Research Gap"),
                    description=gap.get("description", ""),
                    severity=None,
                    suggested_approach=gap.get("suggested_approach", ""),
                )
                db.add(g)
    except Exception as e:
        logger.error(f"Gap mapping failed: {e}")
    db.flush()

    session.status = "complete"
    db.flush()
    logger.info(f"[Research Pipeline] Complete for session {session.session_id}")


async def run_rag_query(
    session_id_str: str,
    question: str,
    db: Session,
) -> Dict[str, Any]:
    """
    Step 6: RAG Chat — query ChromaDB, build context, ask Claude, return answer + citations.
    """
    session = db.query(ResearchSession).filter(ResearchSession.session_id == session_id_str).first()
    if not session:
        raise ValueError(f"Session {session_id_str} not found")

    collection_name = f"research_{session.session_id}"
    chunks = vector_store.query(collection_name, question, n_results=5)
    if not chunks:
        return {"answer": "No relevant content found in the uploaded papers.", "citations": []}

    context = "\n\n---\n\n".join([
        f"[Source: {c['metadata'].get('filename', 'Unknown')}]\n{c['text']}"
        for c in chunks
    ])
    rag_prompt = f"Question: {question}\n\nContext from papers:\n{context}"
    try:
        response = await claude_service.analyze_json(RAG_SYSTEM, rag_prompt, max_tokens=2048)
        return response
    except Exception as e:
        return {"answer": f"Failed to generate response: {e}", "citations": []}
