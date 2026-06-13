import sys
import os
import csv
import traceback

backend_dir = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend"
sys.path.append(backend_dir)

from dotenv import load_dotenv
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

from app.core.database import SessionLocal, engine, Base
from app.models.models import Department, Teacher, Subject, Class, Batch, TimetableEntry

def clean_load(val):
    if not val or val.strip() == '-' or val.strip() == '':
        return 0
    try:
        return int(float(val.strip()))
    except:
        return 0

def seed():
    # Make sure tables exist (they should)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        csv_path = r"c:\Users\ASUS\Downloads\Subject Distribution.csv"
        
        print("--- Step 1: Cleanup Existing Data ---")
        db.query(TimetableEntry).delete(synchronize_session=False)
        db.query(Batch).delete(synchronize_session=False)
        db.query(Class).delete(synchronize_session=False)
        db.query(Subject).delete(synchronize_session=False)
        db.query(Teacher).delete(synchronize_session=False)
        db.query(Department).delete(synchronize_session=False)
        db.commit()
        print("Cleanup Done")

        departments = {}
        classes = {}
        subjects = {}
        
        current_teacher = None
        
        print(f"--- Step 2: Parsing {csv_path} ---")
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader, None) # skip header
            
            for row in reader:
                if len(row) < 18:
                    continue
                
                fac_name = row[1].strip()
                branch = row[5].strip()
                course = row[7].strip()
                
                # Check for end of file / summary row
                if "TOTAL LOAD" in row[0] or "TOTAL LOAD" in row[1]:
                    break
                
                if fac_name:
                    # New teacher
                    total_load = clean_load(row[17])
                    # Create teacher
                    current_teacher = Teacher(
                        name=fac_name,
                        max_load=total_load if total_load > 0 else 20,
                        admin_load=0,
                        status="present"
                    )
                    db.add(current_teacher)
                    db.commit()
                    db.refresh(current_teacher)
                    
                if not current_teacher:
                    continue
                
                # If no branch or valid course, we can't schedule it
                if not branch or not course:
                    continue
                    
                # Ensure Department exists
                if branch not in departments:
                    dept = Department(name=branch, code=branch)
                    db.add(dept)
                    db.commit()
                    db.refresh(dept)
                    departments[branch] = dept
                
                dept_obj = departments[branch]
                
                # Update teacher's default department if not set
                if not current_teacher.dept_id:
                    current_teacher.dept_id = dept_obj.id
                    db.commit()
                
                # Ensure Class exists
                sem = row[3].strip()
                sec = row[4].strip()
                
                # Some sections are like "A,B" or "A/B". Let's handle them.
                if sem and sec:
                    class_name = f"{branch}-Sem{sem}-{sec}"
                    if class_name not in classes:
                        cls = Class(name=class_name, dept_id=dept_obj.id, semester=int(sem), section_code=sec)
                        db.add(cls)
                        db.commit()
                        db.refresh(cls)
                        classes[class_name] = cls
                    
                    cls_obj = classes[class_name]
                    
                    # Check for Batches in Practical
                    batches_str = row[11].strip()
                    if batches_str and batches_str != '-':
                        batch_names = [b.strip() for b in batches_str.replace('"', '').split(',')]
                        for b_name in batch_names:
                            if b_name:
                                # Add batch if it doesn't exist for this class
                                existing = db.query(Batch).filter_by(class_id=cls_obj.id, name=b_name).first()
                                if not existing:
                                    b = Batch(name=b_name, class_id=cls_obj.id)
                                    db.add(b)
                                    db.commit()

                # Determine Subject(s)
                t_load = clean_load(row[8])
                p_load = clean_load(row[10])
                
                # If Theory
                if t_load > 0:
                    key_t = (course, "theory", dept_obj.id)
                    if key_t not in subjects:
                        sub_t = Subject(name=course, type="theory", dept_id=dept_obj.id, weekly_load=t_load, semester=int(sem) if sem else None)
                        db.add(sub_t)
                        db.commit()
                        db.refresh(sub_t)
                        subjects[key_t] = sub_t
                    
                    if subjects[key_t] not in current_teacher.subjects:
                        current_teacher.subjects.append(subjects[key_t])
                        db.commit()
                        
                # If Practical
                if p_load > 0:
                    key_p = (course, "lab", dept_obj.id)
                    if key_p not in subjects:
                        sub_p = Subject(name=course, type="lab", dept_id=dept_obj.id, weekly_load=p_load, semester=int(sem) if sem else None)
                        db.add(sub_p)
                        db.commit()
                        db.refresh(sub_p)
                        subjects[key_p] = sub_p
                        
                    if subjects[key_p] not in current_teacher.subjects:
                        current_teacher.subjects.append(subjects[key_p])
                        db.commit()

        print("CSV SEEDING COMPLETE!")
        
        # Diagnostics
        print(f"Total Departments: {len(departments)}")
        print(f"Total Classes: {len(classes)}")
        print(f"Total Subjects: {len(subjects)}")
        print(f"Total Teachers: {db.query(Teacher).count()}")
        print(f"Total Batches: {db.query(Batch).count()}")

    except Exception as e:
        db.rollback()
        print(f"\nFATAL ERROR: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
