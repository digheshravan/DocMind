from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    page_count = Column(Integer, default=0)
    raw_text = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending | processing | complete | error
    created_at = Column(DateTime(timezone=True), server_default=func.now())
