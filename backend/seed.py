"""
Seed script — run once to populate the database.
Usage:  python seed.py
Usage (reset):  python seed.py --reset
"""
import sys
import os
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

# ── Subjects ──────────────────────────────────────────────────────────────────
subj_map = {}
for s in [
    # CS
    {"name": "Data Structures",        "dept": "CS",  "credits": 4, "type": "theory", "code": "CS301"},
    {"name": "Algorithms",             "dept": "CS",  "credits": 4, "type": "theory", "code": "CS302"},
    {"name": "Database Management",    "dept": "CS",  "credits": 4, "type": "theory", "code": "CS303"},
    {"name": "Operating Systems",      "dept": "CS",  "credits": 4, "type": "theory", "code": "CS304"},
    {"name": "Computer Networks",      "dept": "CS",  "credits": 3, "type": "theory", "code": "CS305"},
    {"name": "Artificial Intelligence","dept": "CS",  "credits": 4, "type": "theory", "code": "CS401"},
    {"name": "Machine Learning",       "dept": "CS",  "credits": 4, "type": "theory", "code": "CS402"},
    {"name": "Web Technologies",       "dept": "CS",  "credits": 3, "type": "theory", "code": "CS403"},
    {"name": "Software Engineering",   "dept": "CS",  "credits": 3, "type": "theory", "code": "CS404"},
    {"name": "CS Lab",                 "dept": "CS",  "credits": 2, "type": "lab",    "code": "CS391"},
    # ECE
    {"name": "Digital Electronics",    "dept": "ECE", "credits": 4, "type": "theory", "code": "EC301"},
    {"name": "VLSI Design",            "dept": "ECE", "credits": 3, "type": "theory", "code": "EC302"},
    {"name": "Embedded Systems",       "dept": "ECE", "credits": 3, "type": "theory", "code": "EC303"},
    {"name": "Signal Processing",      "dept": "ECE", "credits": 4, "type": "theory", "code": "EC304"},
    {"name": "Communication Systems",  "dept": "ECE", "credits": 4, "type": "theory", "code": "EC305"},
    {"name": "ECE Lab",                "dept": "ECE", "credits": 2, "type": "lab",    "code": "EC391"},
]:
    obj = db.query(Subject).filter(Subject.code == s["code"]).first()
    if not obj:
        obj = Subject(
            name=s["name"],
            dept_id=dept_map[s["dept"]].id,
            credits=s["credits"],
            type=s["type"],
            code=s["code"],
        )
        db.add(obj)
        db.flush()
    subj_map[s["code"]] = obj

db.commit()
print(f"  ✓ {len(subj_map)} subjects")

# ── Teachers ──────────────────────────────────────────────────────────────────
teacher_count = 0
for t in [
    {"name": "Dr. Priya Sharma",   "dept": "CS",  "email": "priya@ghrce.edu",   "subjects": ["CS301","CS302","CS303"]},
    {"name": "Prof. Rajesh Kumar", "dept": "CS",  "email": "rajesh@ghrce.edu",  "subjects": ["CS304","CS305","CS391"]},
    {"name": "Dr. Anita Desai",    "dept": "ECE", "email": "anita@ghrce.edu",   "subjects": ["EC301","EC302","EC391"]},
    {"name": "Prof. Suresh Patel", "dept": "ME",  "email": "suresh@ghrce.edu",  "subjects": []},
    {"name": "Dr. Meena Joshi",    "dept": "CS",  "email": "meena@ghrce.edu",   "subjects": ["CS401","CS402","CS403"]},
    {"name": "Prof. Vikram Singh", "dept": "CE",  "email": "vikram@ghrce.edu",  "subjects": []},
    {"name": "Dr. Kavita Nair",    "dept": "ECE", "email": "kavita@ghrce.edu",  "subjects": ["EC303","EC304","EC305"]},
    {"name": "Prof. Amit Gupta",   "dept": "CS",  "email": "amit@ghrce.edu",    "subjects": ["CS404","CS391"]},
]:
    email = t["email"].lower()
    user = user_map.get(email)
    dept_key = t["dept"] if t["dept"] in dept_map else "CS"
    avatar = "".join(
        w[0] for w in t["name"].split() if w[0].isupper()
    )[:2].upper()

    obj = db.query(Teacher).filter(Teacher.name == t["name"]).first()
    if not obj:
        obj = Teacher(
            user_id=user.id if user else None,
            name=t["name"],
            dept_id=dept_map[dept_key].id,
            avatar=avatar,
            max_load=5,
            status="present",
        )
        db.add(obj)
        db.flush()
        teacher_count += 1

    # Always sync subjects
    obj.subjects = [subj_map[c] for c in t["subjects"] if c in subj_map]
    db.flush()

db.commit()
print(f"  ✓ {teacher_count} teachers created  ({db.query(Teacher).count()} total)")

# ── Rooms ─────────────────────────────────────────────────────────────────────
room_count = 0
for r in [
    {"name": "Room 101", "capacity": 60, "type": "classroom", "building": "Main Block", "floor": 1},
    {"name": "Room 102", "capacity": 60, "type": "classroom", "building": "Main Block", "floor": 1},
    {"name": "Room 201", "capacity": 80, "type": "classroom", "building": "Main Block", "floor": 2},
    {"name": "Room 202", "capacity": 80, "type": "classroom", "building": "Main Block", "floor": 2},
    {"name": "CS Lab 1", "capacity": 30, "type": "lab",       "building": "CS Block",   "floor": 1},
    {"name": "CS Lab 2", "capacity": 30, "type": "lab",       "building": "CS Block",   "floor": 1},
    {"name": "ECE Lab",  "capacity": 30, "type": "lab",       "building": "ECE Block",  "floor": 1},
]:
    if not db.query(Room).filter(Room.name == r["name"]).first():
        db.add(Room(**r))
        room_count += 1

db.commit()
print(f"  ✓ {room_count} rooms/labs created  ({db.query(Room).count()} total)")

# ── Classes ───────────────────────────────────────────────────────────────────
class_count = 0
for c in [
    {"name": "CS-A (Sem 5)",  "dept": "CS",  "semester": 5, "strength": 60},
    {"name": "CS-B (Sem 5)",  "dept": "CS",  "semester": 5, "strength": 60},
    {"name": "CS-A (Sem 3)",  "dept": "CS",  "semester": 3, "strength": 60},
    {"name": "ECE-A (Sem 5)", "dept": "ECE", "semester": 5, "strength": 60},
    {"name": "ECE-B (Sem 3)", "dept": "ECE", "semester": 3, "strength": 60},
]:
    if not db.query(Class).filter(Class.name == c["name"]).first():
        db.add(Class(
            name=c["name"],
            dept_id=dept_map[c["dept"]].id,
            semester=c["semester"],
            strength=c["strength"],
        ))
        class_count += 1

db.commit()
print(f"  ✓ {class_count} classes created  ({db.query(Class).count()} total)")

# ── Batches ───────────────────────────────────────────────────────────────────
batch_count = 0
for cls in db.query(Class).all():
    for i in range(1, 4): # Create 3 batches per class
        b_name = f"{cls.name} - B{i}"
        if not db.query(Batch).filter(Batch.name == b_name, Batch.class_id == cls.id).first():
            db.add(Batch(name=b_name, class_id=cls.id))
            batch_count += 1
db.commit()
print(f"  ✓ {batch_count} batches created ({db.query(Batch).count()} total)")

# ── Students ──────────────────────────────────────────────────────────────────
student_count = 0
for cls in db.query(Class).all():
    batches = db.query(Batch).filter(Batch.class_id == cls.id).all()
    if not batches: continue
    
    # Create 6 students per class (2 per batch)
    for i in range(1, 7):
        s_name = f"Student {cls.name.replace(' ', '')} {i}"
        enrollment = f"ENR{cls.dept_id}{cls.semester}00{i}"
        batch = batches[(i-1) % len(batches)]
        email = f"student{cls.id}_{i}@ghrce.edu".lower()
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=hash_password("student123"),
                role="student",
                is_active=True,
            )
            db.add(user)
            db.flush()
        else:
            user.password_hash = hash_password("student123")
            db.flush()

        if not db.query(Student).filter(Student.enrollment_number == enrollment).first():
            db.add(Student(
                user_id=user.id,
                name=s_name,
                enrollment_number=enrollment,
                class_id=cls.id,
                batch_id=batch.id
            ))
            student_count += 1
db.commit()
print(f"  ✓ {student_count} students created ({db.query(Student).count()} total)")

# ── Time Slots ────────────────────────────────────────────────────────────────
slot_count = 0
for s in [
    {"label": "08:00 - 09:00", "slot_index": 0, "start_time": "08:00", "end_time": "09:00"},
    {"label": "09:00 - 10:00", "slot_index": 1, "start_time": "09:00", "end_time": "10:00"},
    {"label": "10:00 - 11:00", "slot_index": 2, "start_time": "10:00", "end_time": "11:00"},
    {"label": "11:00 - 12:00", "slot_index": 3, "start_time": "11:00", "end_time": "12:00"},
    {"label": "12:00 - 01:00", "slot_index": 4, "start_time": "12:00", "end_time": "13:00"},
    {"label": "01:00 - 02:00", "slot_index": 5, "start_time": "13:00", "end_time": "14:00"},
    {"label": "02:00 - 03:00", "slot_index": 6, "start_time": "14:00", "end_time": "15:00"},
    {"label": "03:00 - 04:00", "slot_index": 7, "start_time": "15:00", "end_time": "16:00"},
]:
    if not db.query(TimeSlot).filter(TimeSlot.slot_index == s["slot_index"]).first():
        db.add(TimeSlot(**s))
        slot_count += 1

db.commit()
print(f"  ✓ {slot_count} time slots created  ({db.query(TimeSlot).count()} total)")

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
