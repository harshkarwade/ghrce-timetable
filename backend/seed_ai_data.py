import sys
import os
import traceback

# Set up paths
backend_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_root)

from dotenv import load_dotenv
env_path = os.path.join(backend_root, ".env")
load_dotenv(env_path)

from app.core.database import SessionLocal, engine
from app.models.models import (
    Department, Teacher, Subject, Class, Batch, TimetableEntry, Room, TeacherPreference, Base, teacher_subjects, TimeSlot, TeachingAssignment, User
)
from app.core.security import hash_password

def seed():
    print("Recreating database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # DEPARTMENTS
        print("- Creating Departments...")
        depts = [
            ("Artificial Intelligence", "AI"),
            ("Computer Science Engineering", "CSE"),
            ("Mechanical Engineering", "MECH")
        ]
        dept_objs = {}
        for d_name, d_code in depts:
            d = db.query(Department).filter(Department.code == d_code).first()
            if not d:
                d = Department(name=d_name, code=d_code)
                db.add(d); db.commit(); db.refresh(d)
            dept_objs[d_code] = d

        # DEFAULT ADMIN USER
        print("- Creating Admin User...")
        admin_user = db.query(User).filter(User.email == "admin@ghrce.edu").first()
        if not admin_user:
            db.add(User(
                email="admin@ghrce.edu",
                password_hash=hash_password("admin123"),
                role="admin"
            ))

        # SAMPLE TEACHERS WITH PREFERENCES
        print("- Creating Sample Faculty & Preferences...")
        # Professor X (AI HOD) - Unavailable Monday Mornings
        t1 = Teacher(name="Dr. Hemant P. (HOD-AI)", dept_id=dept_objs["AI"].id, max_load=12, avatar="HP")
        db.add(t1); db.commit(); db.refresh(t1)
        db.add(TeacherPreference(teacher_id=t1.id, day="Monday", preferred_slot_id=1, is_preferred=False))
        db.add(TeacherPreference(teacher_id=t1.id, day="Monday", preferred_slot_id=2, is_preferred=False))

        # SAMPLE CLASSES WITH SECTION CODES
        print("- Creating Classes & Sections...")
        c1 = Class(name="AI-Sem5-A", dept_id=dept_objs["AI"].id, semester=5, section_code="A")
        c2 = Class(name="AI-Sem5-B", dept_id=dept_objs["AI"].id, semester=5, section_code="B")
        db.add_all([c1, c2])

        # INFRASTRUCTURE (Restored)
        print("- Creating Rooms...")
        classroom_rooms = [f"ROOM-{i}" for i in range(1, 21)]
        lab_rooms = ["C02", "C03", "C06", "C07", "C13A", "C13B", "C08", "W21", "E17"]
        for r_name in classroom_rooms:
            db.add(Room(name=r_name, type="classroom", capacity=60))
        for r_name in lab_rooms:
            db.add(Room(name=r_name, type="lab", capacity=30))

        print("- Creating TimeSlots...")
        slots = [
            ("09:30 AM", "10:30 AM", 0),
            ("10:30 AM", "11:30 AM", 1),
            ("11:30 AM", "12:30 PM", 2),
            ("01:30 PM", "02:30 PM", 3),
            ("02:30 PM", "03:30 PM", 4),
            ("03:30 PM", "04:30 PM", 5),
            ("04:30 PM", "05:30 PM", 6),
        ]
        for start, end, idx in slots:
            db.add(TimeSlot(label=f"{start}-{end}", start_time=start, end_time=end, slot_index=idx))

        db.commit()
        print("Infrastructure Seeding Complete v2.0.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
