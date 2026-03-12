from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Replace async sqlite URL with sync one for stability on Windows
sync_url = settings.database_url.replace("sqlite+aiosqlite", "sqlite")

engine = create_engine(
    sync_url, 
    connect_args={"check_same_thread": False}  # Required for SQLite with multiple threads/requests
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency for providing a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup (Synchronous)."""
    from app.models import document, legal, research  # noqa: F401
    Base.metadata.create_all(bind=engine)
