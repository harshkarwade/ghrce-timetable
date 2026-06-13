import os
import sys

backend_dir = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend"
sys.path.append(backend_dir)

from app.core.database import SessionLocal
from app.models.models import Class, TeachingAssignment, TimetableEntry

def audit():
    db = SessionLocal()
    
    classes = db.query(Class).all()
    count_ok = 0
    count_classes = len(classes)
    
    for c in classes:
        assignments = db.query(TeachingAssignment).filter(TeachingAssignment.class_id == c.id).all()
        expected_rows = sum(a.weekly_load for a in assignments)
        generated_rows = db.query(TimetableEntry).filter(TimetableEntry.class_id == c.id).count()
        
        if expected_rows != generated_rows or generated_rows == 0:
            print(f"Class: {c.name:25} | EXPECTED: {expected_rows:3} | GENERATED: {generated_rows:3} | DIFF: {expected_rows - generated_rows}")
        else:
            count_ok += 1
            
    print(f"Audit completed. {count_classes} total classes. {count_ok} classes have perfectly matching workloads.")

if __name__ == "__main__":
    audit()
