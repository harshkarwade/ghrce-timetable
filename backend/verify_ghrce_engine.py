import os
import sys
import collections
import random
from sqlalchemy.orm import joinedload

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_engine import TimetableEngine
from app.core.database import SessionLocal
from app.models.models import Class, Subject, Room, Teacher, Batch, TimeSlot, TeacherPreference, Department, TeachingAssignment

def verify():
    print("=== GHRCE AI Timetable Engine Verification ===")
    db = SessionLocal()
    
    try:
        # Load AI department specifically
        ai_dept = db.query(Department).filter(Department.code == "AI").first()
        if not ai_dept:
            print("ERROR: AI Department not found. Run seed_ai_data.py first.")
            return

        print(f"Verifying for Department: {ai_dept.name} (ID: {ai_dept.id})")

        classes = db.query(Class).filter(Class.dept_id == ai_dept.id).all()
        batches = db.query(Batch).join(Class).filter(Class.dept_id == ai_dept.id).all()
        teachers = db.query(Teacher).filter(Teacher.dept_id == ai_dept.id).options(joinedload(Teacher.subjects), joinedload(Teacher.preferences)).all()
        subjects = db.query(Subject).filter(Subject.dept_id == ai_dept.id).all()
        rooms = db.query(Room).all() 
        time_slots = db.query(TimeSlot).order_by(TimeSlot.slot_index).all()
        assignments = db.query(TeachingAssignment).all()

        print(f"Data Stats: Classes={len(classes)}, Teachers={len(teachers)}, Subjects={len(subjects)}, Assignments={len(assignments)}")

        # Convert to plain dicts for the engine
        classes_data = [{"id": c.id, "name": c.name, "dept_id": c.dept_id, "semester": c.semester} for c in classes]
        batches_data = [{"id": b.id, "name": b.name, "class_id": b.class_id} for b in batches]
        teachers_data = [
            {
                "id": t.id,
                "name": t.name,
                "dept_id": t.dept_id,
                "status": t.status,
                "max_load": t.max_load,
                "subject_ids": [s.id for s in t.subjects],
                "preferences": [
                    {
                        "day": p.day,
                        "preferred_slot_id": p.preferred_slot_id,
                        "is_preferred": p.is_preferred,
                        "preference_weight": p.preference_weight
                    } for p in t.preferences
                ]
            } for t in teachers
        ]
        subjects_data = [
            {
                "id": s.id, 
                "name": s.name, 
                "dept_id": s.dept_id, 
                "type": s.type, 
                "weekly_load": s.weekly_load, 
                "semester": s.semester,
                "is_core": s.is_core,
                "required_room_id": s.required_room_id
            }
            for s in subjects
        ]
        rooms_data = [{"id": r.id, "name": r.name, "type": r.type} for r in rooms]
        slots_data = [{"id": ts.id, "label": ts.label, "slot_index": ts.slot_index} for ts in time_slots]
        assignments_data = [
            {
                "id": a.id,
                "teacher_id": a.teacher_id,
                "subject_id": a.subject_id,
                "class_id": a.class_id,
                "batch_id": a.batch_id,
                "type": a.type,
                "weekly_load": a.weekly_load
            } for a in assignments
        ]

        config = {
            "max_per_day": 7,
            "ga_generations": 10,
            "ga_population": 10
        }

        print("1. Starting Generation...")
        engine = TimetableEngine(config)
        
        result = engine.generate(
            classes=classes_data,
            batches=batches_data,
            teachers=teachers_data,
            subjects=subjects_data,
            rooms=rooms_data,
            time_slots=slots_data,
            teaching_assignments=assignments_data
        )
        
        print(f"Success: {result.success}")
        print(f"Slots Generated: {len(result.slots)}")
        
        if result.success:
            # 1. No Teacher Overlaps
            teacher_slots = collections.defaultdict(list)
            for s in result.slots:
                key = (s.teacher_id, s.day, s.time_slot_id)
                teacher_slots[key].append(s)
            
            overlaps = [k for k, v in teacher_slots.items() if len(v) > 1]
            if not overlaps: print("[PASS] No Teacher Overlaps")
            else: print(f"[FAIL] Found {len(overlaps)} Teacher Overlaps!")

            # 2. No Room Overlaps
            room_slots = collections.defaultdict(list)
            for s in result.slots:
                key = (s.room_id, s.day, s.time_slot_id)
                room_slots[key].append(s)
            r_overlaps = [k for k, v in room_slots.items() if len(v) > 1]
            if not r_overlaps: print("[PASS] No Room Overlaps")
            else: print(f"[FAIL] Found {len(r_overlaps)} Room Overlaps!")

            # 3. No Student Group (Class/Batch) Overlaps
            class_slots = collections.defaultdict(list)
            batch_slots = collections.defaultdict(list)
            for s in result.slots:
                if s.batch_id:
                    batch_slots[(s.batch_id, s.day, s.time_slot_id)].append(s)
                else:
                    class_slots[(s.class_id, s.day, s.time_slot_id)].append(s)
            
            c_overlaps = [k for k, v in class_slots.items() if len(v) > 1]
            b_overlaps = [k for k, v in batch_slots.items() if len(v) > 1]
            if not c_overlaps and not b_overlaps: print("[PASS] No Student/Batch Overlaps")
            else: print(f"[FAIL] Student conflicts detected!")

            # 4. Lab Block Contiguity Check
            lab_requirements = collections.defaultdict(list)
            slots_data_map = {ts.id: ts.slot_index for ts in time_slots}
            for s in result.slots:
                if s.subject_type == "lab":
                    lab_requirements[(s.class_id, s.subject_id, s.batch_id, s.day)].append(slots_data_map[s.time_slot_id])
            
            lab_fail = False
            for req_slots in lab_requirements.values():
                if len(req_slots) != 2:
                    lab_fail = True
                    break
                req_slots.sort()
                if req_slots[1] != req_slots[0] + 1:
                    lab_fail = True
                    break
            if not lab_fail: print("[PASS] Lab Blocks are Contiguous 2h")
            else: print("[FAIL] Found split or non-standard lab blocks!")

            # 5. Teacher Load Equality Check
            load_fail = False
            for t in teachers_data:
                scheduled = len([s for s in result.slots if s.teacher_id == t["id"]])
                if scheduled != t["max_load"]:
                    print(f"[FAIL] Load mismatch for {t['name']}: Required {t['max_load']}, Scheduled {scheduled}")
                    load_fail = True
            if not load_fail: print("[PASS] Teacher Loads match Institutional requirements exactly")

            # 6. Lab Batch Separation
            batch_overlap = False
            for day in range(5):
                for ts in slots_data:
                    slot_id = ts["id"]
                    labs_in_slot = [s for s in result.slots if s.day == engine.DAYS[day] and s.time_slot_id == slot_id and s.subject_type == "lab"]
                    pairs = collections.defaultdict(int)
                    for l in labs_in_slot:
                        pairs[(l.class_id, l.subject_id)] += 1
                    if any(v > 1 for v in pairs.values()):
                        batch_overlap = True
                        break
            if not batch_overlap: print("[PASS] Lab batches are perfectly separated")
            else: print("[FAIL] Found overlapping batches for same lab/class!")

            print("\nVERIFICATION COMPLETE")
        else:
            print("[FAIL] Engine failed to generate a valid timetable.")
            print("Logs (Last 20):")
            for log in result.logs[-20:]:
                print(f"  - {log}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
