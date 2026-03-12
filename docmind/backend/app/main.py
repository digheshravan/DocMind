from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.config import get_settings
from app.routers import shared, legal, research, history

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown (nothing special needed)


app = FastAPI(
    title="DocMind API",
    description="AI-powered document intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in (settings.cors_origins or "").split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shared.router, prefix="/api")
app.include_router(legal.router, prefix="/api/legal")
app.include_router(research.router, prefix="/api/research")
app.include_router(history.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "DocMind API is running", "docs": "/docs"}
