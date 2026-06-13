import csv, os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
from app.core.database import SessionLocal
from app.models.models import Department, Teacher, Subject, Class, Batch, TimetableEntry
from sqlalchemy import or_, text

def seed_real_data():
    db = SessionLocal()
    
    # 1. Clear existing dynamic data
    db.execute(text("DELETE FROM teacher_subjects"))
    db.query(TimetableEntry).delete()
    db.query(Batch).delete()
    db.query(Class).delete()
    db.query(Subject).delete()
    db.query(Teacher).delete()
    db.commit()

    # Department Map
    dept_map = {
        "AI": 5,
        "CAI": 6,
        "CSE-AI": 7,
        "CSE-AIML": 8,
        "CSE": 1,
        "CS": 1
    }

    # Library Setup
    lib_dept = db.query(Department).filter(Department.name == "Computer Science").first()
    lib_dept_id = lib_dept.id if lib_dept else 1
    lib_subj = Subject(name="Library / Self Study", type="theory", weekly_load=0, dept_id=lib_dept_id)
    lib_teacher = Teacher(name="Library Supervisor", status="present", dept_id=lib_dept_id)
    db.add_all([lib_subj, lib_teacher])
    db.commit()

    csv_path = os.path.join(os.path.dirname(__file__), "../data/Subject Distribution.csv")
    current_teacher = None
    
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            faculty_name = row.get("Name of Faculty", "").strip()
            if faculty_name:
                clean_name = faculty_name.split("(")[0].strip()
                teacher = db.query(Teacher).filter(Teacher.name == clean_name).first()
                if not teacher:
                    teacher = Teacher(name=clean_name, status="present", dept_id=dept_map.get(row.get("Branch", ""), 5))
                    db.add(teacher)
                    db.commit()
                    db.refresh(teacher)
                current_teacher = teacher
            
            if not current_teacher or "TOTAL" in row.get("Sr. No", "") or not row.get("Course"):
                continue

            sem = row.get("Sem", "").strip()
            branch = row.get("Branch", "").strip()
            section_raw = row.get("Section", "").strip()
            course_name = row.get("Course", "").strip()
            
            # Loads
            theory = int(row.get("Theory") or 0)
            tutorial = int(row.get("Tutorial") or 0)
            practical = int(row.get("Practical") or 0)
            project = int(row.get("Project") or 0)
            
            if not sem or not branch: continue
            d_id = dept_map.get(branch, 5)

            # Define Load Types to create
            loads = []
            if theory > 0: loads.append((course_name, "theory", theory))
            if tutorial > 0: loads.append((f"{course_name} (Tut)", "theory", tutorial))
            if practical > 0: loads.append((f"{course_name} (PR)", "lab", practical))
            if project > 0: loads.append((f"{course_name} (Proj)", "lab", project))

            for s_name, s_type, s_load in loads:
                subj = db.query(Subject).filter(Subject.name == s_name, Subject.dept_id == d_id).first()
                if not subj:
                    subj = Subject(name=s_name, type=s_type, weekly_load=s_load, dept_id=d_id)
                    db.add(subj)
                    db.commit()
                    db.refresh(subj)
                
                if subj not in current_teacher.subjects:
                    current_teacher.subjects.append(subj)
                    db.commit()

                # Sections and Batches
                sections = []
                if "," in section_raw: sections = [s.strip() for s in section_raw.split(",")]
                elif "/" in section_raw: sections = [s.strip() for s in section_raw.split("/")]
                else: sections = [section_raw]

                batch_raw = row.get("Batch", "").strip()
                for sec in sections:
                    if not sec: continue
                    class_name = f"{branch}-Sem{sem}-{sec}"
                    cls = db.query(Class).filter(Class.name == class_name).first()
                    if not cls:
                        cls = Class(name=class_name, semester=int(sem), dept_id=d_id)
                        db.add(cls)
                        db.commit()
                        db.refresh(cls)
                    
                    if s_type == "lab" and batch_raw:
                        batch_names = [b.strip() for b in batch_raw.replace(" ", "").split(",")]
                        for bn in batch_names:
                            if not bn: continue
                            batch = db.query(Batch).filter(Batch.name == bn, Batch.class_id == cls.id).first()
                            if not batch:
                                batch = Batch(name=bn, class_id=cls.id)
                                db.add(batch); db.commit()

    print("✅ Real data (Theory + Tut + Practical + Project) seeded successfully!")

if __name__ == "__main__":
    seed_real_data()
