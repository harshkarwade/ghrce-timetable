import re
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import Subject, Teacher, TimetableEntry
from sqlalchemy import text

db = SessionLocal()

def normalize(name: str) -> str:
    """Lowercase, replace punctuation with space, collapse spaces."""
    name = name.lower()
    name = re.sub(r'[^a-z0-9]', ' ', name)
    return re.sub(r'\s+', ' ', name).strip()

def dedup():
    subjects = db.query(Subject).order_by(Subject.dept_id, Subject.name).all()

    print("=== All subjects ===")
    for s in subjects:
        print(f"  id={s.id:<4} dept={s.dept_id} type={s.type:<8} wl={s.weekly_load} name={repr(s.name)}")

    # Group by (dept_id, type, normalized_name)
    groups = {}
    for s in subjects:
        key = (s.dept_id, s.type, normalize(s.name))
        groups.setdefault(key, []).append(s)

    print("\n=== Duplicate groups found ===")
    duplicates_found = False
    for key, group in groups.items():
        if len(group) > 1:
            duplicates_found = True
            canonical = min(group, key=lambda x: x.id)
            dupes = [s for s in group if s.id != canonical.id]
            print(f"\nGroup: dept={key[0]} type={key[1]} norm_name='{key[2]}'")
            print(f"  KEEP:   id={canonical.id} name={repr(canonical.name)}")
            for d in dupes:
                print(f"  DELETE: id={d.id}   name={repr(d.name)}")
                
                # 1. Merge teacher subject associations
                for teacher in db.query(Teacher).all():
                    teacher_subj_ids = {ts.id for ts in teacher.subjects}
                    if d.id in teacher_subj_ids and canonical.id not in teacher_subj_ids:
                        teacher.subjects.append(canonical)
                        print(f"    + Added {repr(canonical.name)} to teacher '{teacher.name}'")
                    # Remove reference to duplicate from teacher
                    teacher.subjects = [ts for ts in teacher.subjects if ts.id != d.id]
                
                # 2. Re-point timetable entries
                # Check for table existence or just try
                try:
                    updated = db.query(TimetableEntry).filter(TimetableEntry.subject_id == d.id).update(
                        {"subject_id": canonical.id}, synchronize_session=False
                    )
                    if updated:
                        print(f"    + Re-pointed {updated} TimetableEntry rows from id={d.id} to id={canonical.id}")
                except Exception as e:
                    print(f"    ! Failed to re-point timetable entries: {e}")
                
                # 3. Delete the duplicate subject
                db.delete(d)
                print(f"    Done: Deleted duplicate subject id={d.id}")

    if not duplicates_found:
        print("No duplicates found!")
    else:
        db.commit()
        print("\nDeduplication complete. DB committed.")

if __name__ == "__main__":
    dedup()
    db.close()
