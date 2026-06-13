import os
import sys

backend_dir = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend"
sys.path.append(backend_dir)

from app.core.database import SessionLocal
from app.models.models import Teacher, TeachingAssignment

def analyze():
    db = SessionLocal()
    teachers = db.query(Teacher).all()
    t_dict = {t.id: t.name for t in teachers}
    loads = {t.id: 0 for t in teachers}
    
    assigns = db.query(TeachingAssignment).all()
    for a in assigns:
        loads[a.teacher_id] += a.weekly_load
        
    for k, v in loads.items():
        if v > 20: 
            print(f"HIGH LOAD -> {t_dict[k]}: {v}")
            
    print("Done")

if __name__ == "__main__":
    analyze()
