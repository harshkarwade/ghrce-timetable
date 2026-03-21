from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from app.routers.teachers import router as teachers_router
from app.routers.subjects import router as subjects_router
from app.routers.rooms import router as rooms_router
from app.routers.timetable import router as timetable_router
from app.routers.attendance import router as attendance_router
from app.routers.analytics import router as analytics_router
from app.routers.leaves import router as leaves_router
from app.routers.uploads import router as uploads_router
from app.routers.classes import router as classes_router
from app.routers.batches import router as batches_router
from app.core.database import engine, Base
import os
import traceback
from fastapi.responses import JSONResponse
from fastapi import Request

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GHRCE AI Timetable System",
    description="AI-powered Master Timetable Generator for GH Raisoni College of Engineering",
    version="2.0.1"
)

# ── CORS — Allow all for production launch as we use JWT in headers ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc), "traceback": traceback.format_exc()},
        headers={"Access-Control-Allow-Origin": "*"}
    )

app.include_router(auth_router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(teachers_router,   prefix="/api/teachers",   tags=["Teachers"])
app.include_router(subjects_router,   prefix="/api/subjects",   tags=["Subjects"])
app.include_router(rooms_router,      prefix="/api/rooms",      tags=["Rooms"])
app.include_router(timetable_router,  prefix="/api/timetable",  tags=["Timetable"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(analytics_router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(leaves_router,     prefix="/api/leaves",     tags=["Leaves"])
app.include_router(uploads_router,    prefix="/api/uploads",    tags=["Uploads"])
app.include_router(classes_router,    prefix="/api/classes",    tags=["Classes"])
app.include_router(batches_router,    prefix="/api/batches",    tags=["Batches"])

@app.get("/")
def root():
    return {"message": "GHRCE AI Timetable System API", "status": "running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Triggering uvicorn reload
