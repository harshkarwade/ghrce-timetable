from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_admin, require_teacher, get_current_user
from app.models.models import Teacher, User, Subject
from app.schemas.schemas import TeacherCreate, TeacherOut, TeacherUpdate
from app.core.security import hash_password

router = APIRouter()

@router.get("/", response_model=List[TeacherOut])
def get_teachers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Teacher).all()

@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher

@router.post("/", response_model=TeacherOut)
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    # Create user account for teacher
    user = None
    if data.email and data.password:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(email=data.email, password_hash=hash_password(data.password), role="teacher")
        db.add(user)
        db.flush()

    avatar = "".join([w[0] for w in data.name.split()[:2]]).upper()
    teacher = Teacher(
        user_id=user.id if user else None,
        name=data.name,
        dept_id=data.dept_id,
        max_load=data.max_load,
        designation=data.designation,
        specialization=data.specialization,
        responsibilities=data.responsibilities,
        admin_load=data.admin_load,
        avatar=avatar,
        phone=data.phone,
        status="present"
    )
    db.add(teacher)
    db.flush()

    # Assign subjects
    if data.subject_ids:
        subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
        teacher.subjects = subjects

    db.commit()
    db.refresh(teacher)
    return teacher

@router.patch("/{teacher_id}", response_model=TeacherOut)
def update_teacher(teacher_id: int, data: TeacherUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(teacher, field, value)
    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher deleted"}

@router.patch("/{teacher_id}/status")
def update_status(teacher_id: int, status: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.status = status
    db.commit()
    return {"message": f"Status updated to {status}"}
