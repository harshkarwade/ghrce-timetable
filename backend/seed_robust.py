import sys
import os
import traceback

# Set up paths
backend_dir = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend"
sys.path.append(backend_dir)

from dotenv import load_dotenv
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

from app.core.database import SessionLocal
from app.models.models import (
    Department, Teacher, Subject, Class, Batch, TimetableEntry
)

def seed():
    db = SessionLocal()
    try:
        print("--- Step 0: Ensure AI Department ---")
        ai_dept = db.query(Department).filter(Department.code == "AI").first()
        if not ai_dept:
            ai_dept = Department(name="Artificial Intelligence", code="AI")
            db.add(ai_dept)
            db.commit()
            print("✅ Created AI Department")
        else:
            print(f"✅ AI Department exists (ID: {ai_dept.id})")

        print("--- Step 1: Cleanup AI Data ---")
        class_ids = [c.id for c in db.query(Class).filter(Class.dept_id == ai_dept.id).all()]
        if class_ids:
            db.query(TimetableEntry).filter(TimetableEntry.class_id.in_(class_ids)).delete(synchronize_session=False)
            db.query(Batch).filter(Batch.class_id.in_(class_ids)).delete(synchronize_session=False)
            db.query(Class).filter(Class.dept_id == ai_dept.id).delete(synchronize_session=False)
        db.query(Subject).filter(Subject.dept_id == ai_dept.id).delete(synchronize_session=False)
        db.query(Teacher).filter(Teacher.dept_id == ai_dept.id).delete(synchronize_session=False)
        db.commit()
        print("✅ Cleanup Done")

        print("--- Step 2: Create Classes ---")
        classes_map = {}
        for sem in [3, 5, 7]:
            for sec in ['A', 'B']:
                name = f"AI-Sem{sem}-{sec}"
                cls = Class(name=name, dept_id=ai_dept.id)
                db.add(cls)
                db.commit()
                classes_map[name] = cls.id
                for b in ['B1', 'B2']:
                    db.add(Batch(name=f"{name}-{b}", class_id=cls.id))
                    db.commit()

        print("--- Step 3: Seed Teachers & Subjects ---")
        teachers_data = [
            ("Dr. S. S. Prasad", "SSP", "Assoc. Professor", "NLP", "Exam Cell", 2, [
                ("NLP", "Theory", 7, "A", 3), ("NLP", "Lab", 7, "A", 2)
            ]),
            ("Dr. S. K. Gupta", "SKG", "Professor", "ML", "Research Head", 2, [
                ("Machine Learning", "Theory", 5, "A", 3), ("Machine Learning", "Lab", 5, "A", 2)
            ]),
            ("Dr. M. M. Khan", "MMK", "Assistant Professor", "CS", "Attendance", 2, [
                ("Cryptography", "Theory", 5, "B", 3), ("Network Security", "Lab", 5, "B", 2)
            ]),
            ("Dr. P. S. Patil", "PSP", "Assoc. Professor", "CV", "IEEE Coord", 2, [
                ("Computer Vision", "Theory", 7, "B", 3), ("CV Lab", "Lab", 7, "B", 2)
            ]),
            ("Dr. R. R. Singh", "RRS", "Professor", "AI", "Dept Library", 2, [
                ("Artificial Intelligence", "Theory", 3, "A", 3), ("AI Lab", "Lab", 3, "A", 2)
            ]),
            ("Dr. V. V. Deshmukh", "VVD", "Assistant Professor", "DS", "Student Mentor", 1, [
                ("Data Structures", "Theory", 3, "B", 3)
            ]),
            ("Prof. S. B. Borate", "SBB", "Assistant Professor", "SE", "Website", 1, [
                ("Software Engineering", "Theory", 5, "A", 3)
            ]),
            ("Prof. N. A. Gharde", "NAG", "Assistant Professor", "OS", "Lab Incharge", 1, [
                ("Operating Systems", "Theory", 3, "A", 3)
            ]),
            ("Prof. S. P. Shambharkar", "SPS", "Assistant Professor", "DBMS", "Alumni Connect", 1, [
                ("Database Management", "Theory", 3, "B", 3)
            ]),
            ("Prof. R. S. Thakur", "RST", "Assistant Professor", "TOC", "Hostel Warden", 2, [
                ("Theory of Comp", "Theory", 5, "B", 3)
            ]),
            ("Prof. A. P. Bagade", "APB", "Assistant Professor", "CN", "Canteen Comm", 1, [
                ("Comp Networks", "Theory", 5, "A", 3)
            ]),
        ]

        subject_cache = {}

        for t_name, abbr, desig, spec, resp, a_load, t_subs in teachers_data:
            print(f"Adding Teacher: {t_name}...")
            teacher = Teacher(
                name=t_name, dept_id=ai_dept.id, max_load=18,
                designation=desig, specialization=spec, responsibilities=resp, admin_load=a_load
            )
            db.add(teacher)
            db.commit() # Commit teacher first
            
            for s_name, s_type, sem, sec, s_load in t_subs:
                key = (s_name, s_type, sem, sec)
                if key not in subject_cache:
                    sub = Subject(name=s_name, type=s_type, dept_id=ai_dept.id, weekly_load=s_load)
                    db.add(sub)
                    db.commit()
                    subject_cache[key] = sub.id
                
                # Link
                sub_obj = db.query(Subject).get(subject_cache[key])
                if sub_obj not in teacher.subjects:
                    teacher.subjects.append(sub_obj)
                    db.commit()
            
            print(f"  ✅ {t_name} Done")

        print("\n✨ ALL SEEDING COMPLETE!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ FATAL ERROR: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
