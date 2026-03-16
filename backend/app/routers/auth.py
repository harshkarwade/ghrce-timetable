from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password, create_access_token, get_current_user
)
from app.models.models import User, Teacher, Student, Class, Batch
from app.schemas.schemas import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Find user by email
    user = db.query(User).filter(User.email == data.email.strip().lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2. Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. Check active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # 4. Get linked teacher or student
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    student = db.query(Student).filter(Student.user_id == user.id).first()

    # 5. Create JWT — sub is user id as string (standard practice)
    token = create_access_token({"sub": str(user.id), "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        teacher_id=teacher.id if teacher else None,
        student_id=student.id if student else None,
    )


@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    
    data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "teacher_id": teacher.id if teacher else None,
        "teacher_name": teacher.name if teacher else None,
        "teacher_avatar": teacher.avatar if teacher else None,
    }

    if student:
        data.update({
            "student_id": student.id,
            "class_id": student.class_id,
            "batch_id": student.batch_id,
            "enrollment_number": student.enrollment_number,
            "name": student.name,
            "class_name": student.class_.name if student.class_ else None,
            "batch_name": student.batch.name if student.batch else None,
        })
    
    return data


@router.get("/debug-users")
def debug_users(db: Session = Depends(get_db)):
    """
    DEBUG ONLY — lists all users in DB (no auth required).
    Remove this endpoint in production.
    """
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "has_password": bool(u.password_hash),
        }
        for u in users
    ]
