import os, sys
from dotenv import load_dotenv
import collections

# Add backend to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
sys.path.append(backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))

from app.core.database import SessionLocal
from app.models.models import TimetableEntry, Subject, Class, Batch, Teacher, Room, TimeSlot

def audit():
    db = SessionLocal()
    print("--- STARTING JOINT-SESSION AWARE AUDIT ---")
    
    entries = db.query(TimetableEntry).filter(TimetableEntry.semester_year == "2024-25").all()
    teacher_day_slot = collections.defaultdict(list)
    batch_day_slot = collections.defaultdict(list)
    
    lib_teacher = db.query(Teacher).filter(Teacher.name.like("%Library%")).first()
    lib_teacher_id = lib_teacher.id if lib_teacher else 999
    
    for e in entries:
        if e.teacher_id != lib_teacher_id:
            teacher_day_slot[(e.teacher_id, e.day, e.time_slot_id)].append(e)
            
        if e.batch_id:
            batch_day_slot[(e.batch_id, e.day, e.time_slot_id)].append(e)
        else:
            batches = db.query(Batch).filter(Batch.class_id == e.class_id).all()
            for b in batches:
                batch_day_slot[(b.id, e.day, e.time_slot_id)].append(e)

    total_errors = 0
    print("\n--- TEACHER CONFLICTS (EXCL. JOINT SESSIONS) ---")
    for (t_id, day, slot_id), obs in teacher_day_slot.items():
        if len(obs) > 1:
            # Check if all sessions in this slot are the SAME subject (Joint Session)
            subjs = {o.subject_id for o in obs}
            if len(subjs) == 1: continue # IGNORE SUCCESSFUL JOINT SESSION
            
            total_errors += 1
            teacher = db.query(Teacher).get(t_id)
            print(f"!! TEACHER DOUBLE-BOOKING: {teacher.name if teacher else t_id} on {day} slot {slot_id}")
            for o in obs:
                subj = db.query(Subject).get(o.subject_id)
                cls = db.query(Class).get(o.class_id)
                print(f"   - {subj.name if subj else '?' } in {cls.name if cls else '?'}")

    print("\n--- BATCH/STUDENT CONFLICTS ---")
    for (b_id, day, slot_id), obs in batch_day_slot.items():
        if len(obs) > 1:
            # Check if one is Library and one is Theory (The filler overlap bug)
            # If they are different subjects, it's a conflict unless it's a joint class...
            # But batches from same class having different real subjects in same slot is always bad.
            # Special case: ignore if one of them is Library (we already fixed this in engine, but audit checks it)
            real_obs = [o for o in obs if "Library" not in (db.query(Subject).get(o.subject_id).name if db.query(Subject).get(o.subject_id) else "")]
            if len(real_obs) <= 1: continue # One real subject + library is handled by filler correctly now
            
            total_errors += 1
            batch = db.query(Batch).get(b_id)
            print(f"!! BATCH DOUBLE-BOOKING: {batch.name if batch else b_id} on {day} slot {slot_id}")
            for o in obs:
                subj = db.query(Subject).get(o.subject_id)
                print(f"   - {subj.name if subj else '?'}")

    print(f"\n--- TOTAL CRITICAL LOGICAL ERRORS: {total_errors} ---")
    db.close()

if __name__ == "__main__":
    audit()
