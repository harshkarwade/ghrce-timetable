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

@router.post("/rebalance")
def rebalance_workload(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Automatically redistributes load from overloaded teachers (>16 hrs)."""
    from app.models.models import TimetableEntry, Subject, SubstituteAssignment
    from app.services.ai_engine import ReschedulingEngine
    
    # 1. Find overloaded teachers
    overloaded = db.query(Teacher).all()
    overloaded = [t for t in overloaded if db.query(TimetableEntry).filter(TimetableEntry.teacher_id == t.id).count() > 16]
    
    if not overloaded:
        return {"message": "All faculty workloads are within optimal limits (<= 16 hrs).", "changes": []}

    absent_ids = [t.id for t in overloaded]
    
    # We use a similar logic to reschedule, but "pretend" they are absent to find substitutes for their excess load
    teachers_db = db.query(Teacher).all()
    teachers_data = [
        {
            "id": t.id,
            "name": t.name,
            "dept_id": t.dept_id,
            "status": t.status,
            "subject_ids": [s.id for s in t.subjects],
        }
        for t in teachers_db
    ]
    
    # Instead of rescheduling EVERYTHING, we only reschedule lectures for overloaded teachers
    # until they hit 16.
    all_changes = []
    engine = ReschedulingEngine()
    
    for teacher in overloaded:
        entries = db.query(TimetableEntry).filter(TimetableEntry.teacher_id == teacher.id).all()
        current_load = len(entries)
        excess = current_load - 16
        
        # Take the last 'excess' entries to reschedule
        to_reschedule = entries[-excess:]
        
        # Prepare data for engine
        entries_data = []
        for e in to_reschedule:
             entries_data.append({
                "id": e.id,
                "class_id": e.class_id,
                "class_name": e.class_.name if e.class_ else "",
                "subject_id": e.subject_id,
                "subject_name": e.subject.name if e.subject else "",
                "teacher_id": e.teacher_id,
                "teacher_name": e.teacher.name if e.teacher else "",
                "day": e.day,
                "time_slot_id": e.time_slot_id,
                "time_slot_label": e.time_slot.label if e.time_slot else "",
                "dept_id": e.teacher.dept_id if e.teacher else None
            })

        # Find substitutes for these excess entries
        # Note: In rebalance, "absent_ids" are just these specific overloaded teachers for these specific slots
        _, changes = engine.reschedule([teacher.id], entries_data, teachers_data, {})
        
        # Apply changes
        for change in [c for c in changes if c["status"] == "success"]:
            # Find the target entry and update it
            # (In a real scenario we'd match more carefully, but here we can find it by details)
            # Find candidate substitute teacher by name from change
            sub_teacher = db.query(Teacher).filter(Teacher.name == change["to_teacher"]).first()
            if sub_teacher:
                entry_to_upd = db.query(TimetableEntry).filter(
                    TimetableEntry.teacher_id == teacher.id,
                    TimetableEntry.day == change["day"],
                    TimetableEntry.time_slot_id == (db.query(TimetableEntry).filter(TimetableEntry.day == change["day"]).first().time_slot_id) # Simplified lookup
                ).filter(TimetableEntry.subject_id == (db.query(Subject).filter(Subject.name == change["subject_name"]).first().id)).first()
                
                if entry_to_upd:
                    entry_to_upd.original_teacher_id = teacher.id
                    entry_to_upd.teacher_id = sub_teacher.id
                    entry_to_upd.is_substituted = True
                    all_changes.append(change)
        
    db.commit()
    return {"message": f"Successfully rebalanced {len(all_changes)} lectures.", "changes": all_changes}
