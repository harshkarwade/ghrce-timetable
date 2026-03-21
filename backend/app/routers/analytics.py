from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import TimetableEntry, Teacher, Room, Subject, Class

router = APIRouter()

@router.get("/workload")
def teacher_workload(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    results = (
        db.query(Teacher.id, Teacher.name, Teacher.avatar, Teacher.status, func.count(TimetableEntry.id).label("count"))
        .outerjoin(TimetableEntry, TimetableEntry.teacher_id == Teacher.id)
        .filter((TimetableEntry.semester_year == semester_year) | (TimetableEntry.semester_year == None))
        .group_by(Teacher.id, Teacher.name, Teacher.avatar, Teacher.status)
        .all()
    )
    return [{"teacher_id": r.id, "teacher_name": r.name, "avatar": r.avatar or "?", "status": r.status, "lecture_count": r.count} for r in results]

@router.get("/room-utilization")
def room_utilization(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    rooms = db.query(Room).all()
    total_slots = 5 * 8  # 5 days * 8 time slots
    result = []
    for room in rooms:
        used = db.query(func.count(TimetableEntry.id)).filter(
            TimetableEntry.room_id == room.id,
            TimetableEntry.semester_year == semester_year
        ).scalar()
        result.append({
            "room_id": room.id,
            "room_name": room.name,
            "type": room.type,
            "capacity": room.capacity,
            "slots_used": used,
            "total_slots": total_slots,
            "utilization_pct": round((used / total_slots) * 100, 1) if total_slots else 0
        })
    return result

@router.get("/subject-distribution")
def subject_distribution(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    results = (
        db.query(Subject.name, func.count(TimetableEntry.id).label("count"))
        .join(TimetableEntry, TimetableEntry.subject_id == Subject.id)
        .filter(TimetableEntry.semester_year == semester_year)
        .group_by(Subject.name)
        .all()
    )
    return [{"subject": r.name, "count": r.count} for r in results]

@router.get("/summary")
def summary(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_lectures = db.query(func.count(TimetableEntry.id)).filter(TimetableEntry.semester_year == semester_year).scalar()
    substitutions = db.query(func.count(TimetableEntry.id)).filter(TimetableEntry.is_substituted == True, TimetableEntry.semester_year == semester_year).scalar()
    active_teachers = db.query(func.count(Teacher.id)).filter(Teacher.status == "present").scalar()
    absent_teachers = db.query(func.count(Teacher.id)).filter(Teacher.status == "absent").scalar()
    total_rooms = db.query(func.count(Room.id)).scalar()
    total_classes = db.query(func.count(Class.id)).scalar()

    return {
        "total_lectures": total_lectures,
        "substitutions": substitutions,
        "active_teachers": active_teachers,
        "absent_teachers": absent_teachers,
        "total_rooms": total_rooms,
        "total_classes": total_classes,
        "total_students": 0,
    }

@router.get("/attendance-trends")
def attendance_trends(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.models import Attendance
    
    teacher_present = db.query(func.count(Attendance.id)).filter(Attendance.status == "present").scalar()
    teacher_absent = db.query(func.count(Attendance.id)).filter(Attendance.status == "absent").scalar()
    
    return {
        "teacher": {"present": teacher_present, "absent": teacher_absent},
        "student": {"present": 0, "absent": 0}
    }

@router.get("/day-load")
def day_load(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns total lecture count per weekday to visualise schedule density."""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    result = []
    for day in days:
        count = db.query(func.count(TimetableEntry.id)).filter(
            TimetableEntry.day == day,
            TimetableEntry.semester_year == semester_year
        ).scalar()
        result.append({"day": day[:3], "lectures": count})
    return result

@router.get("/department-load")
def department_load(semester_year: str = "2024-25", db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns lecture count grouped by department name."""
    from app.models.models import Department
    results = (
        db.query(Department.name, func.count(TimetableEntry.id).label("count"))
        .join(Subject, Subject.dept_id == Department.id)
        .join(TimetableEntry, TimetableEntry.subject_id == Subject.id)
        .filter(TimetableEntry.semester_year == semester_year)
        .group_by(Department.name)
        .all()
    )
    return [{"dept": r.name, "count": r.count} for r in results]
