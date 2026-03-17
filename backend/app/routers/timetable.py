from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.models import (
    TimetableEntry,
    Teacher,
    Subject,
    Room,
    Class,
    Batch,
    TimeSlot,
    Department,
    SubstituteAssignment,
    Attendance,
)
from app.schemas.schemas import GenerateRequest, RescheduleRequest
from app.services.ai_engine import TimetableEngine, ReschedulingEngine

router = APIRouter()


def entry_to_dict(e: TimetableEntry) -> dict:
    """Safely convert a TimetableEntry ORM object to a plain dict."""
    return {
        "id": e.id,
        "class_id": e.class_id,
        "class_name": e.class_.name if e.class_ else "",
        "batch_id": e.batch_id,
        "batch_name": e.batch.name if getattr(e, "batch", None) else "",
        "subject_id": e.subject_id,
        "subject_name": e.subject.name if e.subject else "",
        "subject_type": e.subject.type if e.subject else "theory",
        "teacher_id": e.teacher_id,
        "teacher_name": e.teacher.name if e.teacher else "",
        "teacher_avatar": e.teacher.avatar if e.teacher else "",
        "room_id": e.room_id,
        "room_name": e.room.name if e.room else "",
        "day": e.day,
        "time_slot_id": e.time_slot_id,
        "time_slot_label": e.time_slot.label if e.time_slot else "",
        "is_substituted": e.is_substituted,
        "original_teacher_id": e.original_teacher_id,
        "original_teacher_name": (
            e.original_teacher.name if e.original_teacher else None
        ),
        "semester_year": e.semester_year,
    }


def _load_entries(db: Session):
    """Base query with all joinedloads."""
    return db.query(TimetableEntry).options(
        joinedload(TimetableEntry.class_),
        joinedload(TimetableEntry.subject),
        joinedload(TimetableEntry.teacher),
        joinedload(TimetableEntry.original_teacher),
        joinedload(TimetableEntry.room),
        joinedload(TimetableEntry.time_slot),
    )


# ── Generate ─────────────────────────────────────────────────────────────────
@router.post("/generate")
def generate_timetable(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """AI-powered timetable generation using CSP + Backtracking."""

    # Clear existing timetable for this semester, including dependent records
    query = db.query(TimetableEntry).filter(TimetableEntry.semester_year == req.semester_year)
    if req.department_id:
        classes_in_dept = db.query(Class.id).filter(Class.dept_id == req.department_id).subquery()
        query = query.filter(TimetableEntry.class_id.in_(classes_in_dept))
    
    # Get IDs to clear dependencies first (foreign key constraints)
    target_entry_ids = [e.id for e in query.with_entities(TimetableEntry.id).all()]
    if target_entry_ids:
        db.query(SubstituteAssignment).filter(SubstituteAssignment.timetable_entry_id.in_(target_entry_ids)).delete(synchronize_session=False)
        db.query(StudentAttendance).filter(StudentAttendance.timetable_entry_id.in_(target_entry_ids)).delete(synchronize_session=False)
        # Re-run query delete to be sure
        db.query(TimetableEntry).filter(TimetableEntry.id.in_(target_entry_ids)).delete(synchronize_session=False)
        db.commit()

    # Load all data
    classes = db.query(Class).all()
    batches = db.query(Batch).all()
    teachers = db.query(Teacher).options(joinedload(Teacher.subjects)).all()
    subjects = db.query(Subject).all()
    rooms = db.query(Room).all()
    time_slots = db.query(TimeSlot).order_by(TimeSlot.slot_index).all()
    
    existing_entries = []
    if req.department_id:
        existing_entries = [entry_to_dict(e) for e in _load_entries(db).filter(TimetableEntry.semester_year == req.semester_year).all()]

    if not classes or not teachers or not subjects or not rooms or not time_slots:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing data — run seed.py first. "
                f"classes={len(classes)}, teachers={len(teachers)}, "
                f"subjects={len(subjects)}, rooms={len(rooms)}, "
                f"time_slots={len(time_slots)}"
            ),
        )

    # Convert to plain dicts for the engine
    classes_data = [
        {"id": c.id, "name": c.name, "dept_id": c.dept_id} for c in classes
    ]
    batches_data = [
        {"id": b.id, "name": b.name, "class_id": b.class_id} for b in batches
    ]
    teachers_data = [
        {
            "id": t.id,
            "name": t.name,
            "dept_id": t.dept_id,
            "status": t.status,
            "subject_ids": [s.id for s in t.subjects],
        }
        for t in teachers
    ]
    subjects_data = [
        {"id": s.id, "name": s.name, "dept_id": s.dept_id, "type": s.type}
        for s in subjects
    ]
    rooms_data = [{"id": r.id, "name": r.name, "type": r.type} for r in rooms]
    slots_data = [
        {"id": ts.id, "label": ts.label, "slot_index": ts.slot_index}
        for ts in time_slots
    ]

    config = {
        "avoid_consecutive": req.avoid_consecutive,
        "balance_load": req.balance_load,
        "labs_afternoon": req.labs_afternoon,
        "max_per_day": req.max_per_day,
    }

    engine = TimetableEngine(config)
    result = engine.generate(
        classes=classes_data, 
        batches=batches_data,
        teachers=teachers_data, 
        subjects=subjects_data,
        rooms=rooms_data, 
        time_slots=slots_data, 
        semester_year=req.semester_year,
        target_dept_id=req.department_id,
        existing_entries=existing_entries
    )

    # Persist to DB
    for slot in result.slots:
        entry = TimetableEntry(
            class_id=slot.class_id,
            batch_id=slot.batch_id,
            subject_id=slot.subject_id,
            teacher_id=slot.teacher_id,
            room_id=slot.room_id,
            day=slot.day,
            time_slot_id=slot.time_slot_id,
            is_substituted=False,
            semester_year=req.semester_year,
        )
        db.add(entry)

    db.commit()

    return {
        "success": result.success,
        "slots_generated": len(result.slots),
        "iterations": result.iterations,
        "conflicts_detected": result.conflicts_detected,
        "conflicts_resolved": result.conflicts_resolved,
        "logs": result.logs[-30:],
    }


# ── Get timetable entries ─────────────────────────────────────────────────────
@router.get("/")
def get_timetable(
    semester_year: Optional[str] = None,
    class_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    room_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = _load_entries(db)

    # If no semester_year is provided, try to find the most recent one
    if not semester_year:
        latest = db.query(TimetableEntry.semester_year).order_by(TimetableEntry.id.desc()).first()
        if latest:
            semester_year = latest[0]

    if semester_year:
        query = query.filter(TimetableEntry.semester_year == semester_year)

    if class_id:
        query = query.filter(TimetableEntry.class_id == class_id)
    if teacher_id:
        query = query.filter(TimetableEntry.teacher_id == teacher_id)
    if room_id:
        query = query.filter(TimetableEntry.room_id == room_id)

    entries = query.all()
    return [entry_to_dict(e) for e in entries]


# ── Manual Timetable Editor ───────────────────────────────────────────────────
@router.put("/{entry_id}")
def edit_timetable_entry(
    entry_id: int,
    req: dict,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Manually edit a specific exact timetable slot, ensuring no conflicts."""
    teacher_id = req.get("teacher_id")
    subject_id = req.get("subject_id")
    room_id = req.get("room_id")

    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    # High-Accuracy Conflict Validation
    if teacher_id and teacher_id != entry.teacher_id:
        conflict_teacher = db.query(TimetableEntry).filter(
            TimetableEntry.teacher_id == teacher_id,
            TimetableEntry.day == entry.day,
            TimetableEntry.time_slot_id == entry.time_slot_id,
            TimetableEntry.id != entry_id,
            TimetableEntry.semester_year == entry.semester_year
        ).first()
        if conflict_teacher:
            raise HTTPException(status_code=400, detail="Teacher is already booked for this time slot in another class.")

    if room_id and room_id != entry.room_id:
        conflict_room = db.query(TimetableEntry).filter(
            TimetableEntry.room_id == room_id,
            TimetableEntry.day == entry.day,
            TimetableEntry.time_slot_id == entry.time_slot_id,
            TimetableEntry.id != entry_id,
            TimetableEntry.semester_year == entry.semester_year
        ).first()
        if conflict_room:
            raise HTTPException(status_code=400, detail="Room is already occupied for this time slot.")

    if teacher_id:
        entry.teacher_id = teacher_id
    if subject_id:
        entry.subject_id = subject_id
    if room_id:
        entry.room_id = room_id

    db.commit()
    db.refresh(entry)

    updated_entry = _load_entries(db).filter(TimetableEntry.id == entry_id).first()
    return entry_to_dict(updated_entry)


# ── Reschedule ────────────────────────────────────────────────────────────────
@router.post("/reschedule")
def reschedule(
    req: RescheduleRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Auto-reschedule for absent teachers on a given date."""

    absent_records = db.query(Attendance).filter(
        Attendance.date == req.date,
        Attendance.status == "absent",
    ).all()

    if not absent_records:
        return {
            "message": "No absent teachers found for this date",
            "changes": [],
            "total_rescheduled": 0,
        }

    absent_ids = [a.teacher_id for a in absent_records]

    entries_db = _load_entries(db).all()
    teachers_db = db.query(Teacher).options(joinedload(Teacher.subjects)).all()

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
    subjects_map = {
        s.id: {"id": s.id, "name": s.name, "type": s.type}
        for s in db.query(Subject).all()
    }
    entries_data = [entry_to_dict(e) for e in entries_db]

    engine = ReschedulingEngine()
    updated_entries, changes = engine.reschedule(
        absent_ids, entries_data, teachers_data, subjects_map
    )

    # Persist substitutions to DB
    for upd in updated_entries:
        if upd.get("is_substituted") and upd.get("original_teacher_id"):
            db_entry = db.query(TimetableEntry).filter(
                TimetableEntry.id == upd["id"]
            ).first()
            if db_entry:
                db_entry.original_teacher_id = upd["original_teacher_id"]
                db_entry.teacher_id = upd["teacher_id"]
                db_entry.is_substituted = True

                log = SubstituteAssignment(
                    timetable_entry_id=db_entry.id,
                    original_teacher_id=upd["original_teacher_id"],
                    substitute_teacher_id=upd["teacher_id"],
                    date=req.date,
                    reason="Teacher absent",
                )
                db.add(log)

    db.commit()

    return {
        "absent_teachers": len(absent_ids),
        "changes": changes,
        "total_rescheduled": len([c for c in changes if c["status"] == "success"]),
    }


# ── Helper endpoints ──────────────────────────────────────────────────────────
@router.get("/classes")
def get_classes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    classes = db.query(Class).all()
    return [
        {"id": c.id, "name": c.name, "dept_id": c.dept_id, "semester": c.semester}
        for c in classes
    ]


@router.get("/status")
def timetable_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Check if timetable has been generated."""
    count = db.query(TimetableEntry).count()
    return {"total_entries": count, "generated": count > 0}
