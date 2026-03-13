from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Student, Batch, User
from app.schemas.schemas import StudentCreate, StudentOut, BatchCreate, BatchOut

router = APIRouter()

# ── Batches ───────────────────────────────────────────────────────────────────
@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(batch: BatchCreate, db: Session = Depends(get_db)):
    db_batch = Batch(**batch.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("/batches", response_model=List[BatchOut])
def get_batches(class_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Batch)
    if class_id:
        query = query.filter(Batch.class_id == class_id)
    return query.all()

# ── Students ──────────────────────────────────────────────────────────────────
@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    if db.query(Student).filter(Student.enrollment_number == student.enrollment_number).first():
        raise HTTPException(status_code=400, detail="Student with this enrollment number already exists")

    student_data = student.model_dump(exclude={"email", "password"})
    db_student = Student(**student_data)
    
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/", response_model=List[StudentOut])
def get_students(class_id: int = None, batch_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if batch_id:
        query = query.filter(Student.batch_id == batch_id)
    return query.all()
