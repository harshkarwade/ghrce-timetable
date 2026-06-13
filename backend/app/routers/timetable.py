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
    StudentAttendance,
    TeachingAssignment,
    Notice,
)
from app.schemas.schemas import GenerateRequest, RescheduleRequest, TimetableEntryCreate, TimetableEntryUpdate
from app.services.ai_engine import TimetableEngine, ReschedulingEngine, get_shortcode, get_initials
from app.services.reporting_service import ReportingService
from fastapi.responses import Response, StreamingResponse

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
        "subject_shortcode": e.subject_shortcode,
        "faculty_initials": e.faculty_initials,
        "dept_code": e.dept_code,
        "section_code": e.section_code,
        "semester_year": e.semester_year,
    }


def _load_entries(db: Session):
    """Base query with all joinedloads."""
    return db.query(TimetableEntry).options(
        joinedload(TimetableEntry.class_),
        joinedload(TimetableEntry.batch),
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
    assignments = db.query(TeachingAssignment).filter(TeachingAssignment.semester_year == req.semester_year).all()
    
    existing_entries_raw = _load_entries(db).filter(TimetableEntry.semester_year == req.semester_year).all()
    
    # ── Scope Filtering ───────────────────────────────────────────────────────
    if req.department_id:
        # We only generate for classes in this department
        target_classes = [c for c in classes if c.dept_id == req.department_id]
        target_class_ids = [c.id for c in target_classes]
        
        # Existing entries for OTHER departments become hard constraints
        existing_entries = [
            entry_to_dict(e) for e in existing_entries_raw 
            if e.class_id not in target_class_ids
        ]
        classes_to_generate = target_classes
    else:
        # Global regenerate: no external constraints, all classes targeted
        existing_entries = []
        classes_to_generate = classes

    if not classes_to_generate or not teachers or not subjects or not rooms or not time_slots:
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
        {
            "id": c.id, 
            "name": c.name, 
            "dept_id": c.dept_id,
            "dept_code": c.department.code if c.department else "AI",
            "semester": c.semester,
            "section_code": c.section_code or "",
        } for c in classes_to_generate
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
            "max_load": t.max_load,
            "admin_load": t.admin_load,
            "subject_ids": [s.id for s in t.subjects],
        }
        for t in teachers
    ]
    subjects_data = [
        {
            "id": s.id, "name": s.name, "dept_id": s.dept_id,
            "type": s.type, "weekly_load": s.weekly_load,
            "semester": s.semester,
        }
        for s in subjects
    ]
    rooms_data = [{"id": r.id, "name": r.name, "type": r.type} for r in rooms]
    slots_data = [
        {"id": ts.id, "label": ts.label, "slot_index": ts.slot_index}
        for ts in time_slots
    ]

    assignments_data = [
        {
            "class_id": a.class_id,
            "subject_id": a.subject_id,
            "teacher_id": a.teacher_id,
            "batch_id": a.batch_id,
            "type": a.type,
            "weekly_load": a.weekly_load
        } for a in assignments
    ]

    config = {
        "avoid_consecutive": req.avoid_consecutive,
        "balance_load": req.balance_load,
        "labs_afternoon": req.labs_afternoon,
        "max_per_day": req.max_per_day,
    }

    engine = TimetableEngine(config)
    import os, json
    if os.getenv("DEBUG_ENGINE", "").lower() in ("1", "true", "yes"):
        with open("engine_input_debug.json", "w") as f:
            json.dump({
                "classes": classes_data,
                "teachers": teachers_data,
                "subjects": subjects_data,
                "rooms": rooms_data,
                "slots": slots_data
            }, f, indent=2)
    result = engine.generate(
        classes=classes_data, 
        batches=batches_data,
        teachers=teachers_data, 
        subjects=subjects_data,
        rooms=rooms_data, 
        time_slots=slots_data, 
        teaching_assignments=assignments_data,
        semester_year=req.semester_year,
        target_dept_id=req.department_id,
        existing_entries=existing_entries
    )
    print(f"DEBUG: ENGINE RESULT: Success={result.success}, Slots={len(result.slots)}")

    # Clear existing engine-generated notices
    db.query(Notice).filter(Notice.target_role == "admin", Notice.title.like("AI Engine:%")).delete()

    # Clear existing timetable entries for the target semester and classes
    # If a department is specified, clear all classes in that department.
    # Otherwise, clear all classes (full regenerate).
    clear_query = db.query(TimetableEntry).filter(TimetableEntry.semester_year == req.semester_year)
    if req.department_id:
        # Filter for classes in this department
        target_class_ids = [c.id for c in classes if c.dept_id == req.department_id]
        clear_query = clear_query.filter(TimetableEntry.class_id.in_(target_class_ids))
    
    clear_query.delete(synchronize_session=False)

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
            subject_shortcode=slot.subject_shortcode,
            faculty_initials=slot.faculty_initials,
            dept_code=slot.dept_code,
            section_code=slot.section_code,
            semester_year=req.semester_year,
        )
        db.add(entry)

    # Persist Notices
    for n in result.notice_board.get("notices", []):
        db_notice = Notice(
            title=f"AI Engine: {n['category']}",
            content=n["message"],
            target_role="admin"
        )
        db.add(db_notice)

    db.commit()

    return {
        "success": result.success,
        "slots_generated": len(result.slots),
        "iterations": result.iterations,
        "conflicts_detected": result.conflicts_detected,
        "conflicts_resolved": result.conflicts_resolved,
        "logs": result.logs[-30:],
        "notice_board": result.notice_board
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
def check_timetable_conflict(db: Session, day: str, time_slot_id: int, semester_year: str, 
                             teacher_id: Optional[int] = None, room_id: Optional[int] = None, 
                             exclude_id: Optional[int] = None):
    if teacher_id:
        conflict = db.query(TimetableEntry).filter(
            TimetableEntry.day == day,
            TimetableEntry.time_slot_id == time_slot_id,
            TimetableEntry.semester_year == semester_year,
            TimetableEntry.teacher_id == teacher_id
        )
        if exclude_id:
            conflict = conflict.filter(TimetableEntry.id != exclude_id)
        
        conflict = conflict.first()
        if conflict:
            return f"Teacher is already booked for this time slot in class {conflict.class_.name}."
            
    if room_id:
        conflict = db.query(TimetableEntry).filter(
            TimetableEntry.day == day,
            TimetableEntry.time_slot_id == time_slot_id,
            TimetableEntry.semester_year == semester_year,
            TimetableEntry.room_id == room_id
        )
        if exclude_id:
            conflict = conflict.filter(TimetableEntry.id != exclude_id)
            
        conflict = conflict.first()
        if conflict:
            return f"Room is already occupied by class {conflict.class_.name}."
    return None

@router.post("/")
def create_manual_entry(
    req: TimetableEntryCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Manually create a timetable entry."""
    # 1. Check for conflicts
    error = check_timetable_conflict(
        db, req.day, req.time_slot_id, req.semester_year,
        teacher_id=req.teacher_id, room_id=req.room_id
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    # 2. Check if this exact slot (Class + Day + Slot) is already taken
    existing = db.query(TimetableEntry).filter(
        TimetableEntry.class_id == req.class_id,
        TimetableEntry.batch_id == req.batch_id,
        TimetableEntry.day == req.day,
        TimetableEntry.time_slot_id == req.time_slot_id,
        TimetableEntry.semester_year == req.semester_year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This class/batch already has a session in this slot.")

    # 3. Enrich with metadata if missing
    subject = db.query(Subject).filter(Subject.id == req.subject_id).first()
    teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
    cls = db.query(Class).filter(Class.id == req.class_id).first()
    
    entry_data = req.dict()
    if subject:
        entry_data["subject_shortcode"] = get_shortcode(subject.name)
    if teacher:
        entry_data["faculty_initials"] = get_initials(teacher.name)
    if cls:
        entry_data["dept_code"] = cls.department.code if cls.department else "AI"
        entry_data["section_code"] = cls.section_code or ""

    # 4. Create
    entry = TimetableEntry(**entry_data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return entry_to_dict(_load_entries(db).filter(TimetableEntry.id == entry.id).first())

@router.put("/{entry_id}")
def edit_timetable_entry(
    entry_id: int,
    req: TimetableEntryUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Manually edit a specific exact timetable slot, ensuring no conflicts."""
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    teacher_id = req.teacher_id or entry.teacher_id
    room_id = req.room_id or entry.room_id
    day = req.day or entry.day
    time_slot_id = req.time_slot_id or entry.time_slot_id

    # Conflict Validation
    error = check_timetable_conflict(
        db, day, time_slot_id, entry.semester_year,
        teacher_id=teacher_id, room_id=room_id, exclude_id=entry_id
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    if req.teacher_id:
        entry.teacher_id = req.teacher_id
        teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
        if teacher:
            entry.faculty_initials = get_initials(teacher.name)
    if req.subject_id:
        entry.subject_id = req.subject_id
        subject = db.query(Subject).filter(Subject.id == req.subject_id).first()
        if subject:
            entry.subject_shortcode = get_shortcode(subject.name)
    if req.room_id:
        entry.room_id = req.room_id
    if req.day:
        entry.day = req.day
    if req.time_slot_id:
        entry.time_slot_id = req.time_slot_id

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
        absent_ids, entries_data, teachers_data, subjects_map, target_day=req.day
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


@router.get("/classes")
def get_classes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    classes = db.query(Class).all()
    return [
        {"id": c.id, "name": c.name, "dept_id": c.dept_id, "semester": c.semester}
        for c in classes
    ]

@router.get("/slots")
def get_slots(db: Session = Depends(get_db), _=Depends(get_current_user)):
    slots = db.query(TimeSlot).order_by(TimeSlot.slot_index).all()
    return [{"id": s.id, "label": s.label, "slot_index": s.slot_index} for s in slots]


@router.get("/status")
def timetable_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Check if timetable has been generated."""
    count = db.query(TimetableEntry).count()
    return {"total_entries": count, "generated": count > 0}

@router.get("/export/pdf/{class_name}")
async def export_pdf(class_name: str, db: Session = Depends(get_db)):
    target_class = db.query(Class).filter(Class.name == class_name).first()
    if not target_class: raise HTTPException(status_code=404, detail="Class not found")
    slots = db.query(TimeSlot).order_by(TimeSlot.slot_index).all()
    slots_data = [{"label": s.label, "slot_index": s.slot_index} for s in slots]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    schedule_data = {}
    for day in days:
        day_slots = []
        for slot in slots:
            if slot.label == "12:30 - 01:30":
                day_slots.append({"is_recess": True})
                continue
            entry = db.query(TimetableEntry).filter(
                TimetableEntry.class_id == target_class.id,
                TimetableEntry.day == day,
                TimetableEntry.time_slot_id == slot.id
            ).first()
            if entry:
                day_slots.append({"subject": entry.subject.name, "teacher": entry.teacher.name, "room": entry.room.name})
            else:
                day_slots.append({"subject": None})
        schedule_data[day] = day_slots
    pdf_content = ReportingService.generate_pdf(class_name, slots_data, schedule_data)
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Timetable_{class_name}.pdf"})

@router.get("/export/excel/{class_name}")
async def export_excel(class_name: str, db: Session = Depends(get_db)):
    target_class = db.query(Class).filter(Class.name == class_name).first()
    if not target_class: raise HTTPException(status_code=404, detail="Class not found")
    slots = db.query(TimeSlot).order_by(TimeSlot.slot_index).all()
    slots_data = [{"label": s.label, "slot_index": s.slot_index} for s in slots]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    schedule_data = {}
    for day in days:
        day_slots = []
        for slot in slots:
            if slot.label == "12:30 - 01:30":
                day_slots.append({"is_recess": True})
                continue
            entry = db.query(TimetableEntry).filter(TimetableEntry.class_id == target_class.id, TimetableEntry.day == day, TimetableEntry.time_slot_id == slot.id).first()
            if entry:
                day_slots.append({"subject": entry.subject.name, "teacher": entry.teacher.name, "room": entry.room.name})
            else:
                day_slots.append({"subject": None})
        schedule_data[day] = day_slots
    excel_content = ReportingService.generate_excel(class_name, slots_data, schedule_data)
    return Response(content=excel_content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=Timetable_{class_name}.xlsx"})

@router.get("/affected")
def get_affected_entries(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get timetable entries for teachers who are currently marked absent."""
    # ... logic remains same ...
    """Get timetable entries for teachers who are currently marked absent."""
    # Get absent teachers
    absent_ids = [t.id for t in db.query(Teacher).filter(Teacher.status == "absent").all()]
    if not absent_ids: return []
    
    # Get current day (Monday, etc.)
    import datetime
    day_name = datetime.date.today().strftime("%A")
    # For dev purposes, if it's weekend, just show Monday for testing
    if day_name in ["Saturday", "Sunday"]: day_name = "Monday"
    
    # Get entries for these teachers for today
    entries = db.query(TimetableEntry).filter(
        TimetableEntry.teacher_id.in_(absent_ids),
        TimetableEntry.day == day_name
    ).all()
    
    return [
        {
            "id": e.id,
            "day": e.day,
            "slot_id": e.time_slot_id,
            "slot_label": e.time_slot.label if e.time_slot else "N/A",
            "class_name": e.class_.name if e.class_ else "N/A",
            "subject_id": e.subject_id,
            "subject_name": e.subject.name if e.subject else "N/A",
            "teacher_name": e.teacher.name if e.teacher else "N/A",
        }
        for e in entries
    ]
