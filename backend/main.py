from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from app.routers.teachers import router as teachers_router
from app.routers.subjects import router as subjects_router
from app.routers.rooms import router as rooms_router
from app.routers.timetable import router as timetable_router
from app.routers.attendance import router as attendance_router
from app.routers.analytics import router as analytics_router
from app.routers.students import router as students_router
from app.routers.leaves import router as leaves_router
from app.routers.notices import router as notices_router
from app.routers.uploads import router as uploads_router
from app.core.database import engine, Base
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GHRCE AI Timetable System",
    description="AI-powered Master Timetable Generator for GH Raisoni College of Engineering",
    version="2.0.1"
)

# ── CORS — reads FRONTEND_URL env var; falls back to all origins ──────────────
frontend_url = os.getenv("FRONTEND_URL", "*")
# Include all known Vercel origins for this project
allow_origins = [
    "https://frontend-inky-alpha-47.vercel.app",
    "https://frontend-inky-alpha-47-harshkarwade.vercel.app",
    "https://frontend-5jkgkee8z-harshkarwade-7068s-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]

if frontend_url != "*" and frontend_url not in allow_origins:
    allow_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(teachers_router,   prefix="/api/teachers",   tags=["Teachers"])
app.include_router(subjects_router,   prefix="/api/subjects",   tags=["Subjects"])
app.include_router(rooms_router,      prefix="/api/rooms",      tags=["Rooms"])
app.include_router(timetable_router,  prefix="/api/timetable",  tags=["Timetable"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(analytics_router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(students_router,   prefix="/api/students",   tags=["Students"])
app.include_router(leaves_router,     prefix="/api/leaves",     tags=["Leaves"])
app.include_router(notices_router,    prefix="/api/notices",    tags=["Notices"])
app.include_router(uploads_router,    prefix="/api/uploads",    tags=["Uploads"])

@app.get("/")
def root():
    return {"message": "GHRCE AI Timetable System API", "status": "running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Triggering uvicorn reload
