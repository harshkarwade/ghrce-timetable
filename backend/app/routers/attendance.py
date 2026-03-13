from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Attendance, Teacher
from app.schemas.schemas import AttendanceCreate, AttendanceOut

router = APIRouter()

@router.post("/", response_model=AttendanceOut)
def mark_attendance(data: AttendanceCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Upsert: update if exists for same teacher+date
    existing = db.query(Attendance).filter(
        Attendance.teacher_id == data.teacher_id,
        Attendance.date == data.date
    ).first()

    if existing:
        existing.status = data.status
        db.commit()
        db.refresh(existing)
        # Update teacher status
        t = db.query(Teacher).filter(Teacher.id == data.teacher_id).first()
        if t:
            t.status = data.status
            db.commit()
        return existing

    att = Attendance(teacher_id=data.teacher_id, date=data.date, status=data.status)
    db.add(att)
    t = db.query(Teacher).filter(Teacher.id == data.teacher_id).first()
    if t:
        t.status = data.status
    db.commit()
    db.refresh(att)
    return att

@router.get("/today")
def get_today_attendance(db: Session = Depends(get_db), _=Depends(get_current_user)):
    today = date.today()
    records = db.query(Attendance).filter(Attendance.date == today).all()
    return [{"teacher_id": r.teacher_id, "status": r.status, "date": r.date} for r in records]

@router.get("/teacher/{teacher_id}")
def get_teacher_attendance(teacher_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    records = db.query(Attendance).filter(Attendance.teacher_id == teacher_id).order_by(Attendance.date.desc()).limit(30).all()
    return records
