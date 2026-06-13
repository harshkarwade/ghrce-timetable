import pandas as pd
import numpy as np
import os
import sys
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.models import (
    Department, Teacher, Subject, Class, Batch, teacher_subjects, TeachingAssignment
)

CORE_SUBJECT_KEYWORDS = [
    "DSA", "Data Structure", "Operating System", "OS", "DBMS", "Database", 
    "Soft Computing", "OOPS", "Object Oriented", "FLA", "Formal Language",
    "Data Networks", "Computer Architecture", "FIoT", "Internet of Things",
    "AWS", "Cloud Computing", "Data Visualization", "DV", "Blockchain",
    "Data Warehousing", "DWM", "Distributed DBMS", "DDBMS"
]

def parse_subject_distribution(csv_path: str, semester_year: str = "2024-25"):
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Clean up column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]
    
    db = SessionLocal()
    try:
        # Get/Create AI Department
        ai_dept = db.query(Department).filter(Department.code == "AI").first()
        if not ai_dept:
            ai_dept = Department(name="Artificial Intelligence", code="AI")
            db.add(ai_dept)
            db.commit()
            db.refresh(ai_dept)

        # Faculty data aggregation
        faculty_load_requirements = {}
        processed_faculty = {} # name -> id
        class_subject_batch_count = {} # tracks auto-generated batches to prevent B1 double-booking
        
        def get_val(row, primary, secondary=None):
            if primary in row and pd.notna(row[primary]): return row[primary]
            if secondary and secondary in row and pd.notna(row[secondary]): return row[secondary]
            return np.nan

        current_faculty = None
        
        for index, row in df.iterrows():
            faculty_val = get_val(row, 'Professor', 'Name of Faculty')
            course_val = get_val(row, 'Subject', 'Course')
            
            # Skip noise rows or total row
            if pd.isna(row.get('Sr. No')) and pd.isna(faculty_val) and pd.isna(course_val):
                continue
            sr_no_val = str(row.get('Sr. No', '')).upper()
            if sr_no_val == "TOTAL LOAD":
                break
                
            # Faculty logic: propagate name down if empty
            if pd.notna(faculty_val):
                current_faculty = str(faculty_val).strip()
            
            if not current_faculty:
                continue

            # Load Faculty if not already processed
            if current_faculty not in processed_faculty:
                # Calculate total load for this faculty (sum of all rows)
                faculty_total_load = 18 # Default
                
                # Check for either Professor or Name of Faculty
                fac_col = 'Professor' if 'Professor' in df.columns else 'Name of Faculty'
                if fac_col in df.columns:
                    faculty_rows = df[df[fac_col].ffill() == current_faculty]
                    if not faculty_rows.empty and 'Total Load' in df.columns:
                        load_val = faculty_rows['Total Load'].max()
                        if pd.notna(load_val):
                            faculty_total_load = int(load_val)
                
                teacher = Teacher(name=current_faculty, dept_id=ai_dept.id, max_load=faculty_total_load)
                db.add(teacher)
                db.flush()
                processed_faculty[current_faculty] = teacher.id
            
            teacher_id = processed_faculty[current_faculty]
            
            # Extract Class/Subject Info
            sem = get_val(row, 'Year', 'Sem')
            branch_val = get_val(row, 'Dept', 'Branch')
            branch = str(branch_val).strip() if pd.notna(branch_val) else "GEN"
            section_val = row.get('Section')
            section = str(section_val).strip() if pd.notna(section_val) else "A"
            course_name = str(course_val).strip() if pd.notna(course_val) else ""
            subject_code = str(row.get('Code', '')).strip()
            
            if pd.isna(sem) or course_name == "nan" or course_name == "":
                continue

            # Create Class
            class_name = f"{branch}-Sem{int(sem)}-{section}"
            ghrce_class = db.query(Class).filter(Class.name == class_name).first()
            if not ghrce_class:
                ghrce_class = Class(name=class_name, dept_id=ai_dept.id, semester=int(sem), strength=60)
                db.add(ghrce_class)
                db.flush()

            # Create Subject
            # Handle Core detection
            is_core = any(keyword in course_name.upper() for keyword in CORE_SUBJECT_KEYWORDS)
            
            theory_hrs = row['Theory'] if pd.notna(row['Theory']) and row['Theory'] != "-" else 0
            practical_hrs = row['Practical'] if pd.notna(row['Practical']) and row['Practical'] != "-" else 0
            
            # Since a teacher can have both theory and lab for the same course in one row, 
            # we might need to create two subjects or handle them as one with specific load.
            # GHRCE usually creates separate entries for PR and TH.
            
            if float(theory_hrs) > 0:
                subj_name_th = f"{course_name} (TH)"
                subject_th = db.query(Subject).filter(Subject.name == subj_name_th, Subject.dept_id == ai_dept.id, Subject.semester == int(sem)).first()
                if not subject_th:
                    subject_th = Subject(
                        name=subj_name_th, 
                        type="theory", 
                        dept_id=ai_dept.id, 
                        semester=int(sem), 
                        is_core=is_core,
                        weekly_load=int(theory_hrs),
                        code=f"{subject_code}/TH"
                    )
                    db.add(subject_th)
                    db.flush()
                
                # Assign to teacher
                teacher = db.query(Teacher).get(teacher_id)
                if subject_th not in teacher.subjects:
                    teacher.subjects.append(subject_th)
                
                db.add(TeachingAssignment(
                    teacher_id=teacher_id,
                    subject_id=subject_th.id,
                    class_id=ghrce_class.id,
                    type="theory",
                    weekly_load=int(theory_hrs),
                    semester_year=semester_year
                ))

            if float(practical_hrs) > 0:
                subj_name_pr = f"{course_name} (PR)"
                subject_pr = db.query(Subject).filter(Subject.name == subj_name_pr, Subject.dept_id == ai_dept.id, Subject.semester == int(sem)).first()
                if not subject_pr:
                    subject_pr = Subject(
                        name=subj_name_pr, 
                        type="lab", 
                        dept_id=ai_dept.id, 
                        semester=int(sem), 
                        is_core=is_core,
                        weekly_load=int(practical_hrs), # This total load will be split by the engine
                        code=f"{subject_code}/PR"
                    )
                    db.add(subject_pr)
                    db.flush()
                
                # Assign to teacher
                teacher = db.query(Teacher).get(teacher_id)
                if subject_pr not in teacher.subjects:
                    teacher.subjects.append(subject_pr)
                
                # Handle Batches
                batch_str = str(row['Batch']).strip() if pd.notna(row['Batch']) else ""
                num_batches = int(float(practical_hrs) / 2)
                
                # Parse batch list if available (e.g. "A1,A2,A3")
                if batch_str and batch_str != "nan":
                    batch_list = [b.strip() for b in batch_str.split(",")]
                else:
                    batch_key = f"{class_name}_{subject_pr.id}"
                    start_idx = class_subject_batch_count.get(batch_key, 0)
                    batch_list = [f"B{start_idx + i + 1}" for i in range(num_batches)]
                    class_subject_batch_count[batch_key] = start_idx + num_batches
                
                for b_code in batch_list:
                    b_name = f"{class_name}-{b_code}"
                    ghrce_batch = db.query(Batch).filter(Batch.name == b_name, Batch.class_id == ghrce_class.id).first()
                    if not ghrce_batch:
                        ghrce_batch = Batch(name=b_name, batch_code=b_code, class_id=ghrce_class.id)
                        db.add(ghrce_batch)
                        db.flush()
                    
                    db.add(TeachingAssignment(
                        teacher_id=teacher_id,
                        subject_id=subject_pr.id,
                        class_id=ghrce_class.id,
                        batch_id=ghrce_batch.id,
                        type="lab",
                        weekly_load=2,
                        semester_year=semester_year
                    ))

        db.commit()
        print("CSV Data Ingestion Complete.")

    except Exception as e:
        db.rollback()
        print(f"ERROR Parsing CSV: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Correct path to the root of the project from backend/app/services/excel_parser.py
    # 1: services, 2: app, 3: backend, 4: root
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    csv_file = os.path.join(root_dir, "data", "Subject Distribution.csv")
    parse_subject_distribution(csv_file)
