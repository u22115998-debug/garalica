import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, SessionLocal, Base
from app.seed import seed_admin
from app.routers import auth_router, issues_router, comments_router, uploads_router, users_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed admin
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Seeding admin user...")
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    logger.info("Application ready")
    yield
    # Shutdown
    logger.info("Shutting down")


app = FastAPI(
    title="GaraKrral Bug Tracker",
    description="A clean, modern issue tracker",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router)
app.include_router(issues_router.router)
app.include_router(comments_router.router)
app.include_router(uploads_router.router)
app.include_router(users_router.router)


# Serve uploaded files directly at /uploads
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "bugs.garakrral.com"}
