from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), unique=True, index=True)  # UUID
    topic_description = Column(Text, nullable=True)
    paper_count = Column(Integer, default=0)
    status = Column(String(50), default="pending")  # pending|processing|complete|error
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    papers = relationship("Paper", back_populates="session", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="session", cascade="all, delete-orphan")
    literature_reviews = relationship("LiteratureReview", back_populates="session", cascade="all, delete-orphan")


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    filename = Column(String(255), nullable=False)
    title = Column(String(500), nullable=True)
    authors = Column(Text, nullable=True)
    abstract = Column(Text, nullable=True)
    page_count = Column(Integer, default=0)
    chroma_indexed = Column(Boolean, default=False)
    raw_text = Column(Text, nullable=True)

    session = relationship("ResearchSession", back_populates="papers")


class LiteratureReview(Base):
    __tablename__ = "literature_reviews"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    review_text = Column(Text, nullable=True)
    key_themes = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ResearchSession", back_populates="literature_reviews")


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True)
    type = Column(String(50), nullable=False)  # contradiction | gap
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    paper_a_id = Column(Integer, ForeignKey("papers.id", ondelete="SET NULL"), nullable=True)
    paper_b_id = Column(Integer, ForeignKey("papers.id", ondelete="SET NULL"), nullable=True)
    severity = Column(String(50), nullable=True)  # HIGH|MEDIUM|LOW
    suggested_approach = Column(Text, nullable=True)

    session = relationship("ResearchSession", back_populates="insights")
