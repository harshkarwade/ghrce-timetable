import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.models import TimetableEntry, Subject

engine = create_engine("sqlite:///c:/Users/ASUS/Downloads/GHRCE-AI-Timetable-v3/ghrce-timetable/ghrce_v2.db")
Session = sessionmaker(bind=engine)
db = Session()

entries = db.query(TimetableEntry).join(Subject).filter(Subject.type == 'lab').all()

if not entries:
    print("No lab entries found in the database. Has the timetable been generated?")
else:
    # Sort them by batch -> day -> slot
    lab_map = {}
    for e in entries:
        key = f"{e.class_.name} - Batch {e.batch.name if e.batch else 'None'} - {e.subject.name}"
        if key not in lab_map:
            lab_map[key] = []
        lab_map[key].append(f"{e.day} | {e.time_slot.label if e.time_slot else e.time_slot_id}")
    
    for key, slots in lab_map.items():
        print(f"\n{key}:")
        for s in sorted(slots):
            print(f"  - {s}")

db.close()
