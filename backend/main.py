from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, teachers, subjects, rooms, timetable, attendance, analytics, students, leaves, notices, uploads
from app.core.database import engine, Base
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GHRCE AI Timetable System",
    description="AI-powered Master Timetable Generator for GH Raisoni College of Engineering",
    version="2.0.0"
)

# ── CORS — reads FRONTEND_URL env var; falls back to all origins ──────────────
frontend_url = os.getenv("FRONTEND_URL", "*")
if frontend_url == "*":
    allow_origins = ["*"]
else:
    allow_origins = [
        frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True if frontend_url != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(teachers.router,   prefix="/api/teachers",   tags=["Teachers"])
app.include_router(subjects.router,   prefix="/api/subjects",   tags=["Subjects"])
app.include_router(rooms.router,      prefix="/api/rooms",      tags=["Rooms"])
app.include_router(timetable.router,  prefix="/api/timetable",  tags=["Timetable"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(students.router,   prefix="/api/students",   tags=["Students"])
app.include_router(leaves.router,     prefix="/api/leaves",     tags=["Leaves"])
app.include_router(notices.router,    prefix="/api/notices",    tags=["Notices"])
app.include_router(uploads.router,    prefix="/api/uploads",    tags=["Uploads"])

@app.get("/")
def root():
    return {"message": "GHRCE AI Timetable System API", "status": "running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Triggering uvicorn reload
