"""
Seed script — run once to populate the database.
Usage:  python seed.py
Usage (reset):  python seed.py --reset
"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.models import (
    User, Department, Teacher, Subject, Room, Class, TimeSlot,
    TimetableEntry, Attendance, SubstituteAssignment, Batch, Student,
    LeaveRequest, Notice, StudentAttendance
)
from app.core.security import hash_password
from sqlalchemy import text

# ── Reset flag ────────────────────────────────────────────────────────────────
RESET = "--reset" in sys.argv

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if RESET:
    print("⚠️  Resetting all data...")
    # Drop in reverse FK order
    db.execute(text("DELETE FROM substitute_assignments"))
    db.execute(text("DELETE FROM teaching_assignments"))
    db.execute(text("DELETE FROM attendance"))
    db.execute(text("DELETE FROM timetable_entries"))
    db.execute(text("DELETE FROM student_attendance"))
    db.execute(text("DELETE FROM teacher_subjects"))
    db.execute(text("DELETE FROM teachers"))
    db.execute(text("DELETE FROM students"))
    db.execute(text("DELETE FROM users"))
    db.execute(text("DELETE FROM subjects"))
    db.execute(text("DELETE FROM rooms"))
    db.execute(text("DELETE FROM batches"))
    db.execute(text("DELETE FROM classes"))
    db.execute(text("DELETE FROM time_slots"))
    db.execute(text("DELETE FROM departments"))
    db.commit()
    print("   Done — all tables cleared.\n")

print("🌱 Seeding GHRCE database...")

# ── Departments ───────────────────────────────────────────────────────────────
dept_map = {}
for d in [
    {"name": "Computer Science",          "code": "CS"},
    {"name": "Electronics & Communication","code": "ECE"},
    {"name": "Mechanical Engineering",    "code": "ME"},
    {"name": "Civil Engineering",         "code": "CE"},
]:
    obj = db.query(Department).filter(Department.code == d["code"]).first()
    if not obj:
        obj = Department(**d)
        db.add(obj)
        db.flush()
    dept_map[d["code"]] = obj

db.commit()
print(f"  ✓ {len(dept_map)} departments")

# ── Users ─────────────────────────────────────────────────────────────────────
user_map = {}
for u in [
    {"email": "admin@ghrce.edu",   "password": "admin123",   "role": "admin"},
    {"email": "priya@ghrce.edu",   "password": "teacher123", "role": "teacher"},
    {"email": "rajesh@ghrce.edu",  "password": "teacher123", "role": "teacher"},
    {"email": "anita@ghrce.edu",   "password": "teacher123", "role": "teacher"},
    {"email": "suresh@ghrce.edu",  "password": "teacher123", "role": "teacher"},
    {"email": "meena@ghrce.edu",   "password": "teacher123", "role": "teacher"},
    {"email": "vikram@ghrce.edu",  "password": "teacher123", "role": "teacher"},
    {"email": "kavita@ghrce.edu",  "password": "teacher123", "role": "teacher"},
    {"email": "amit@ghrce.edu",    "password": "teacher123", "role": "teacher"},
]:
    email = u["email"].lower()
    obj = db.query(User).filter(User.email == email).first()
    if not obj:
        obj = User(
            email=email,
            password_hash=hash_password(u["password"]),
            role=u["role"],
            is_active=True,
        )
        db.add(obj)
        db.flush()
    else:
        # Always re-hash password in case it changed
        obj.password_hash = hash_password(u["password"])
        obj.is_active = True
        db.flush()
    user_map[email] = obj

db.commit()
print(f"  ✓ {len(user_map)} users  (passwords re-hashed)")

import json

# ── Load Subject Distribution Data ───────────────────────────────────────────
dist_path = os.path.join(os.path.dirname(__file__), "subject_distribution.json")
with open(dist_path, "r", encoding="utf-8") as f:
    distribution = json.load(f)

# ── Departments ───────────────────────────────────────────────────────────────
# Extract unique branches from distribution
branches = sorted(list(set(d["branch"] for d in distribution if d["branch"])))
dept_map = {}
for b_code in branches:
    obj = db.query(Department).filter(Department.code == b_code).first()
    if not obj:
        obj = Department(name=f"Dept of {b_code}", code=b_code)
        db.add(obj)
        db.flush()
    dept_map[b_code] = obj

db.commit()
print(f"  ✓ {len(dept_map)} departments created from Excel.")

# ── Subjects & Teachers ───────────────────────────────────────────────────────
subj_map = {}
teacher_map = {}

for entry in distribution:
    s_name = entry["course"].strip()
    s_code = entry["code"].strip() or s_name
    
    def to_int(v):
        if not v or v.strip() == "-": return 0
        try: return int(v.strip())
        except: return 0
        
    theory = to_int(entry.get("theory"))
    practical = to_int(entry.get("practical"))
    
    # Track codes created
    s_code_t = f"{s_code}-T" if practical > 0 else s_code
    s_code_p = f"{s_code}-P" if theory > 0 else s_code
    
    if theory > 0:
        obj_t = db.query(Subject).filter(Subject.code == s_code_t).first()
        if not obj_t:
            obj_t = Subject(
                name=s_name,
                dept_id=dept_map[entry["branch"]].id if entry["branch"] in dept_map else dept_map[branches[0]].id,
                credits=theory,
                type="theory",
                code=s_code_t,
                weekly_load=theory,
                semester=int(entry["sem"]) if entry.get("sem") and str(entry["sem"]).isdigit() else None
            )
            db.add(obj_t)
            db.flush()
            
    if practical > 0:
        obj_p = db.query(Subject).filter(Subject.code == s_code_p).first()
        if not obj_p:
            obj_p = Subject(
                name=s_name,
                dept_id=dept_map[entry["branch"]].id if entry["branch"] in dept_map else dept_map[branches[0]].id,
                credits=practical,
                type="lab",
                code=s_code_p,
                weekly_load=practical,
                semester=int(entry["sem"]) if entry.get("sem") and str(entry["sem"]).isdigit() else None
            )
            db.add(obj_p)
            db.flush()

    # 2. Teacher
    t_name = entry["faculty"].strip()
    if t_name not in teacher_map:
        email = t_name.lower().replace(" ", ".") + "@ghrce.edu"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=hash_password("teacher123"),
                role="teacher",
                is_active=True
            )
            db.add(user)
            db.flush()
            
        obj = db.query(Teacher).filter(Teacher.name == t_name).first()
        if not obj:
            avatar = "".join(w[0] for w in t_name.split() if w[0].isupper())[:2]
            obj = Teacher(
                user_id=user.id,
                name=t_name,
                dept_id=dept_map[entry["branch"]].id if entry["branch"] in dept_map else dept_map[branches[0]].id,
                avatar=avatar,
                max_load=24, # Increased for dense Excel distribution
                status="present"
            )
            db.add(obj)
            db.flush()
        teacher_map[t_name] = obj

    # 3. Associate Teacher with Subjects
    t_obj = teacher_map[t_name]
    if theory > 0:
        s_obj_t = db.query(Subject).filter(Subject.code == s_code_t).first()
        if s_obj_t and s_obj_t not in t_obj.subjects:
            t_obj.subjects.append(s_obj_t)
    if practical > 0:
        s_obj_p = db.query(Subject).filter(Subject.code == s_code_p).first()
        if s_obj_p and s_obj_p not in t_obj.subjects:
            t_obj.subjects.append(s_obj_p)

db.commit()
print(f"  ✓ {db.query(Subject).count()} subjects and {len(teacher_map)} teachers synchronized.")

# ── Classes & Batches ─────────────────────────────────────────────────────────
# Format: Branch-Sem-Section (e.g. CSE-AIML-Sem5-B)
unique_classes = set()
for entry in distribution:
    if entry["branch"] and entry["sem"] and entry["section"]:
        unique_classes.add((entry["branch"], entry["sem"], entry["section"]))

class_map = {}
for b, s, sec in unique_classes:
    c_name = f"{b}-Sem{s}-{sec}"
    obj = db.query(Class).filter(Class.name == c_name).first()
    if not obj:
        obj = Class(
            name=c_name,
            dept_id=dept_map[b].id,
            semester=int(s),
            strength=60
        )
        db.add(obj)
        db.flush()
    class_map[c_name] = obj

    # Create batches A1, A2, A3 or B1, B2, B3...
    prefix = sec[0] if sec else "A"
    for i in range(1, 4):
        b_name = f"{prefix}{i}"
        if not db.query(Batch).filter(Batch.name == b_name, Batch.class_id == obj.id).first():
            db.add(Batch(name=b_name, class_id=obj.id))

db.commit()
print(f"  ✓ {len(class_map)} classes and associated batches created.")

# ── Rooms ─────────────────────────────────────────────────────────────────────
for r in [
    {"name": "F01", "capacity": 60, "type": "classroom", "building": "Main", "floor": 3},
    {"name": "F02", "capacity": 60, "type": "classroom", "building": "Main", "floor": 3},
    {"name": "F03", "capacity": 60, "type": "classroom", "building": "Main", "floor": 3},
    {"name": "F26", "capacity": 60, "type": "classroom", "building": "Main", "floor": 3},
    {"name": "E33", "capacity": 60, "type": "classroom", "building": "E-Wing", "floor": 3},
    {"name": "W36", "capacity": 60, "type": "classroom", "building": "W-Wing", "floor": 3},
    {"name": "W37", "capacity": 60, "type": "classroom", "building": "W-Wing", "floor": 3},
    {"name": "G03", "capacity": 60, "type": "classroom", "building": "Main", "floor": 4},
    {"name": "E36", "capacity": 60, "type": "classroom", "building": "E-Wing", "floor": 3},
    {"name": "C02", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 0},
    {"name": "C03", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 0},
    {"name": "C07", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 0},
    {"name": "C13A", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 1},
    {"name": "C13B", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 1},
    {"name": "E17", "capacity": 30, "type": "lab", "building": "E-Wing", "floor": 1},
    {"name": "C08", "capacity": 30, "type": "lab", "building": "C-Wing", "floor": 0},
    {"name": "W21", "capacity": 30, "type": "lab", "building": "W-Wing", "floor": 2},
]:
    if not db.query(Room).filter(Room.name == r["name"]).first():
        db.add(Room(**r))

# ── Time Slots ────────────────────────────────────────────────────────────────
for i, label in enumerate([
    "09:30 - 10:30", "10:30 - 11:30", "11:30 - 12:30", 
    "12:30 - 01:30", # RECESS
    "01:30 - 02:30", "02:30 - 03:30", "03:30 - 04:30", "04:30 - 05:30"
]):
    if not db.query(TimeSlot).filter(TimeSlot.slot_index == i).first():
        db.add(TimeSlot(label=label, slot_index=i, start_time=label.split(" - ")[0], end_time=label.split(" - ")[1]))

db.commit()
print(f"  ✓ Time slots synchronized.")

db.close()

print("\n✅ Database seeded successfully!")
print("\n📋 Login Credentials:")
print("   Admin:   admin@ghrce.edu  / admin123")
print("   Teacher: priya@ghrce.edu  / teacher123")
print("   Student: student1_1@ghrce.edu / student123")
print("\n⚡ Next steps:")
print("   1. uvicorn main:app --reload")
print("   2. Open http://localhost:3000")
print("   3. Login as Admin → click 'Generate AI Timetable'")
print("   4. Then login as Teacher to see schedule data")
print("\n🔍 If login still fails, visit:")
print("   http://localhost:8000/api/auth/debug-users")
