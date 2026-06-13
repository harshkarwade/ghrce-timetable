import os, sys
from dotenv import load_dotenv
import collections

# Add backend to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
sys.path.append(backend_dir)

env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

from app.core.database import SessionLocal
from app.models.models import Class, Batch, Teacher, Subject, Room, TimeSlot
from app.services.ai_engine import TimetableEngine

def dictify(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def verify():
    db = SessionLocal()
    out = open("verify_out.txt", "w", encoding="utf-8")
    try:
        classes = [dictify(c) for c in db.query(Class).all()]
        batches = [dictify(b) for b in db.query(Batch).all()]
        
        teachers_db = db.query(Teacher).all()
        teachers = []
        for t in teachers_db:
            td = dictify(t)
            td["subject_ids"] = [s.id for s in t.subjects]
            teachers.append(td)
            
        subjects = [dictify(s) for s in db.query(Subject).all()]
        rooms = [dictify(r) for r in db.query(Room).all()]
        time_slots = [dictify(ts) for ts in db.query(TimeSlot).order_by(TimeSlot.slot_index).all()]

        out.write(f"Loaded: {len(classes)} classes, {len(teachers)} teachers, {len(time_slots)} time slots\n")

        engine = TimetableEngine({
            "flexible_lunch": True,
            "no_gaps_strict": True,
            "lunch_slots": [3, 4]
        })
        
        result = engine.generate(
            classes=classes,
            batches=batches,
            teachers=teachers,
            subjects=subjects,
            rooms=rooms,
            time_slots=time_slots,
            semester_year="2024-25"
        )
        
        out.write(f"\nGenerator Success: {result.success}\n")
        out.write(f"Conflicts Detected: {result.conflicts_detected}\n")
        out.write(f"Conflicts Resolved: {result.conflicts_resolved}\n")
        out.write(f"Slots Scheduled: {len(result.slots)}\n")
        
        if not result.slots:
            out.write("[ERROR] No slots generated! Check heuristics or data constraints.\n")
            return

        has_gaps = False
        class_day_slots = collections.defaultdict(list)
        for s in result.slots:
            ts_idx = next(i for i, ts in enumerate(time_slots) if ts["id"] == s.time_slot_id)
            class_day_slots[(s.class_id, s.day)].append(ts_idx)
            
        for (c_id, day), indices in class_day_slots.items():
            indices_sorted = sorted(list(set(indices)))
            if not indices_sorted: continue
            
            min_idx = indices_sorted[0]
            max_idx = indices_sorted[-1]
            
            for idx in range(min_idx, max_idx):
                # Skip lunch slots in gap check if flexible_lunch is on
                if idx not in indices_sorted:
                    if idx not in [3, 4]:
                        has_gaps = True
                        cls_obj = db.query(Class).get(c_id)
                        out.write(f"[ERROR] Class: {cls_obj.name} on {day} has invalid GAP at index {idx}!\n")
        
        if not has_gaps:
             out.write("[OK] Gap checking passed! All classes have contiguous schedules outside of allowed lunch breaks.\n")
        
        # Persist to database!
        from app.models.models import TimetableEntry
        db.query(TimetableEntry).filter(TimetableEntry.semester_year == "2024-25").delete(synchronize_session=False)
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
                semester_year="2024-25",
            )
            db.add(entry)
        db.commit()
        out.write(f"[OK] Database populated with {len(result.slots)} slots successfully.\n")
        
    except Exception as e:
        import traceback
        traceback.print_exc(file=out)
    finally:
        out.close()
        db.close()

if __name__ == "__main__":
    verify()
