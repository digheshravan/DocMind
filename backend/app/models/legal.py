from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class LegalAnalysis(Base):
    __tablename__ = "legal_analyses"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True)
    overall_risk_score = Column(Float, default=0.0)
    summary_text = Column(Text, nullable=True)
    red_flags = Column(JSON, default=list)
    missing_protections = Column(JSON, default=list)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clauses = relationship("ClauseRisk", back_populates="analysis", cascade="all, delete-orphan")


class ClauseRisk(Base):
    __tablename__ = "clause_risks"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("legal_analyses.id", ondelete="CASCADE"), index=True)
    clause_title = Column(String(500), nullable=False)
    clause_text = Column(Text, nullable=False)
    clause_type = Column(String(100), default="other")  # liability|termination|payment|IP|privacy|dispute|penalty|other
    risk_level = Column(String(20), default="OK")  # HIGH|MEDIUM|LOW|OK
    risk_reason = Column(Text, nullable=True)
    plain_english = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    page_ref = Column(Integer, nullable=True)

    analysis = relationship("LegalAnalysis", back_populates="clauses")
