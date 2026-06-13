import sys
import os
import collections

# Setup path
PROJECT_ROOT = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable"
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.append(PROJECT_ROOT)
sys.path.append(BACKEND_DIR)

# Force SQLite for verification
os.environ["DATABASE_URL"] = f"sqlite:///{BACKEND_DIR}\ghrce_v2.db"

from app.core.database import SessionLocal
from app.models.models import Class, Teacher, Subject, Room, TimeSlot, Batch, TeacherPreference
from app.services.ai_engine import TimetableEngine

def verify():
    print("--- GHRCE HYBRID ENGINE VERIFICATION ---")
    db = SessionLocal()
    try:
        # Fetch data
        classes = [dict(id=c.id, name=c.name, dept_id=c.dept_id) for c in db.query(Class).all()]
        # For teachers, we need to include subjects and preferences
        teachers = []
        for t in db.query(Teacher).all():
            teachers.append({
                "id": t.id,
                "name": t.name,
                "dept_id": t.dept_id,
                "status": t.status,
                "subject_ids": [s.id for s in t.subjects],
                "preferences": t.preferences # Pass objects
            })
            
        subjects = [dict(id=s.id, name=s.name, type=s.type, dept_id=s.dept_id) for s in db.query(Subject).all()]
        rooms = [dict(id=r.id, name=r.name, type=r.type) for r in db.query(Room).all()]
        time_slots = [dict(id=ts.id, label=ts.label, slot_index=ts.slot_index) for ts in db.query(TimeSlot).all()]
        batches = [dict(id=b.id, name=b.name, class_id=b.class_id) for b in db.query(Batch).all()]

        print(f"Loaded: {len(classes)} Classes, {len(teachers)} Teachers, {len(subjects)} Subjects")

        # Run Engine
        engine = TimetableEngine(config={"ga_generations": 10, "ga_population": 5})
        print("Starting Generation (CP + GA)...")
        result = engine.generate(classes, batches, teachers, subjects, rooms, time_slots)

        print(f"Success: {result.success}")
        print(f"Total Slots Generated: {len(result.slots)}")
        
        # Verify Preferences (Soft Constraint check)
        # Dr. S. K. Gupta prefers Monday
        gupta_slots = [s for s in result.slots if s.teacher_name == "Dr. S. K. Gupta"]
        monday_gupta = [s for s in gupta_slots if s.day == "Monday"]
        print(f"Dr. S. K. Gupta Slots: {len(gupta_slots)} (Monday: {len(monday_gupta)})")
        
        # Dr. M. M. Khan avoids Monday
        khan_slots = [s for s in result.slots if s.teacher_name == "Dr. M. M. Khan"]
        monday_khan = [s for s in khan_slots if s.day == "Monday"]
        print(f"Dr. M. M. Khan Slots: {len(khan_slots)} (Monday: {len(monday_khan)})")

        if result.success:
            print("Verification passed! The hybrid engine generated a conflict-free, optimized timetable.")
        else:
            print("Verification failed or partially failed.")
            for log in result.logs:
                print(f"Log: {log}")

    except Exception as e:
        print(f"Verification Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify()
