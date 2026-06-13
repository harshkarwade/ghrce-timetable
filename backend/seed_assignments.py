import os
import sys
import json
import collections

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import (
    Teacher, Subject, Class, Batch, TeachingAssignment
)

def seed_assignments():
    db = SessionLocal()
    try:
        print("Seeding TeachingAssignments directly from subject_distribution.json...")
        
        # 1. Clear existing assignments for 2024-25
        db.query(TeachingAssignment).filter(TeachingAssignment.semester_year == "2024-25").delete()
        db.commit()
        
        # Load the distribution json
        dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "subject_distribution.json")
        with open(dist_path, "r", encoding="utf-8") as f:
            distribution = json.load(f)
            
        teachers = db.query(Teacher).all()
        subjects = db.query(Subject).all()
        classes = db.query(Class).all()
        batches = db.query(Batch).all()
        
        teacher_map = {t.name.strip().lower(): t for t in teachers}
        
        # Build maps for subjects (by name and type)
        subj_map = {}
        for s in subjects:
            key = (s.name.strip().lower(), s.type)
            subj_map[key] = s
            
        # Build maps for classes
        class_map = {c.name.strip().lower(): c for c in classes}
        
        # Build maps for batches (by class_id and batch name)
        batch_map = {}
        for b in batches:
            batch_map[(b.class_id, b.name.strip().upper())] = b

        assignment_count = 0

        for entry in distribution:
            fac_name = entry.get("faculty", "").strip()
            branch = entry.get("branch", "").strip()
            sem = entry.get("sem", "").strip()
            sec = entry.get("section", "").strip()
            course = entry.get("course", "").strip()
            
            # Skip rows without faculty or branch/sem/section
            if not fac_name or not branch or not sem or not sec or not course:
                continue
                
            # Find Teacher
            t_obj = teacher_map.get(fac_name.lower())
            if not t_obj:
                print(f"  Warning: Teacher '{fac_name}' not found in database.")
                continue
                
            # Find Class
            class_name = f"{branch}-Sem{sem}-{sec}".lower()
            c_obj = class_map.get(class_name)
            if not c_obj:
                # Handle cases like "A, B" or "A,B" sections
                print(f"  Warning: Class '{class_name}' not found in database.")
                continue
                
            theory_load = int(entry.get("theory", 0)) if str(entry.get("theory")).isdigit() else 0
            prac_load = int(entry.get("practical", 0)) if str(entry.get("practical")).isdigit() else 0
            
            # Seed Theory Assignment
            if theory_load > 0:
                s_obj = subj_map.get((course.lower(), "theory"))
                if not s_obj:
                    # Fallback to general type check
                    s_obj = next((s for s in subjects if s.name.lower() == course.lower() and s.type == "theory"), None)
                if not s_obj:
                    # Let's create the Subject on the fly or warn
                    print(f"  Warning: Subject '{course}' (theory) not found.")
                    continue
                    
                assign = TeachingAssignment(
                    teacher_id=t_obj.id,
                    subject_id=s_obj.id,
                    class_id=c_obj.id,
                    batch_id=None,
                    type="theory",
                    weekly_load=theory_load,
                    semester_year="2024-25"
                )
                db.add(assign)
                assignment_count += 1
                
            # Seed Practical Assignment
            if prac_load > 0:
                s_obj = subj_map.get((course.lower(), "lab"))
                if not s_obj:
                    s_obj = next((s for s in subjects if s.name.lower() == course.lower() and s.type == "lab"), None)
                if not s_obj:
                    print(f"  Warning: Subject '{course}' (lab) not found.")
                    continue
                    
                # Get batches
                batch_str = entry.get("batch", "").strip()
                b_names = [b.strip().upper() for b in batch_str.replace('"', '').split(',') if b.strip()]
                
                if not b_names:
                    # Default batches if none specified on sheet
                    b_names = ["A1", "A2", "A3"] if "A" in sec.upper() else ["B1", "B2", "B3"]
                    
                for b_name in b_names:
                    b_obj = batch_map.get((c_obj.id, b_name))
                    if not b_obj:
                        # Auto-create batch if missing
                        b_obj = Batch(name=b_name, class_id=c_obj.id)
                        db.add(b_obj)
                        db.commit()
                        db.refresh(b_obj)
                        batch_map[(c_obj.id, b_name)] = b_obj
                        
                    assign = TeachingAssignment(
                        teacher_id=t_obj.id,
                        subject_id=s_obj.id,
                        class_id=c_obj.id,
                        batch_id=b_obj.id,
                        type="lab",
                        weekly_load=2,  # 2 hrs per lab session
                        semester_year="2024-25"
                    )
                    db.add(assign)
                    assignment_count += 1
                    
        db.commit()
        print(f"Successfully seeded {assignment_count} TeachingAssignment records directly from JSON.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_assignments()
