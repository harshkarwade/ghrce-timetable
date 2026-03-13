from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.models import Subject, Department
from app.schemas.schemas import SubjectCreate, SubjectOut

router = APIRouter()

@router.get("/", response_model=List[SubjectOut])
def get_subjects(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Subject).all()

@router.post("/", response_model=SubjectOut)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    subject = Subject(**data.dict())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    depts = db.query(Department).all()
    return [{"id": d.id, "name": d.name, "code": d.code} for d in depts]
