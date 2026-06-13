import os
import sys

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from app.core.database import SessionLocal
from app.models.models import Teacher, Subject, Class, Batch

def check_capacity():
    db = SessionLocal()
    
    teachers = db.query(Teacher).all()
    
    for t in teachers:
        print(f"Teacher: {t.name} (Max Load: {t.max_load})")
        subj_ids = [s.id for s in t.subjects]
        total_needed = 0
        
        # Calculate needed hrs based on ai_engine fallback logic
        classes = db.query(Class).all()
        for cls in classes:
            dept_subjs = db.query(Subject).filter(
                Subject.dept_id == cls.dept_id,
                Subject.semester == cls.semester
            ).all()
            
            for s in dept_subjs:
                if s.id in subj_ids:
                    if s.type == "lab":
                        batches = db.query(Batch).filter(Batch.class_id == cls.id).all()
                        needed = 2 * len(batches)
                        total_needed += needed
                        print(f"  Lab: {s.name} for {cls.name} ({len(batches)} batches) -> +{needed}h")
                    else:
                        needed = s.weekly_load
                        total_needed += needed
                        print(f"  Theory: {s.name} for {cls.name} -> +{needed}h")
                        
        print(f"  TOTAL NEEDED: {total_needed}h (Max: {t.max_load}h)")
        if total_needed > t.max_load:
            print("  *** EXCEEDS MAX LOAD ***")
        print()
    db.close()

if __name__ == "__main__":
    check_capacity()
