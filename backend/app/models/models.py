from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class StatusEnum(str, enum.Enum):
    present = "present"
    absent = "absent"

class RoomTypeEnum(str, enum.Enum):
    classroom = "classroom"
    lab = "lab"

class SubjectTypeEnum(str, enum.Enum):
    theory = "theory"
    lab = "lab"

# ── User ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), default="teacher")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    teacher       = relationship("Teacher", back_populates="user", uselist=False)

# ── Department ───────────────────────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"
    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String(100), nullable=False, unique=True)
    code     = Column(String(20), unique=True)
    teachers = relationship("Teacher", back_populates="department")
    subjects = relationship("Subject", back_populates="department")
    classes  = relationship("Class", back_populates="department")

# ── Teacher ───────────────────────────────────────────────────────────────────
class Teacher(Base):
    __tablename__ = "teachers"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    name       = Column(String(150), nullable=False)
    dept_id    = Column(Integer, ForeignKey("departments.id"))
    max_load   = Column(Integer, default=18)
    designation = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    responsibilities = Column(String, nullable=True)
    admin_load = Column(Integer, default=0)
    avatar     = Column(String(10))
    status     = Column(String(20), default="present")
    phone      = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user           = relationship("User", back_populates="teacher")
    department     = relationship("Department", back_populates="teachers")
    subjects       = relationship("Subject", secondary="teacher_subjects", back_populates="teachers")
    timetable_entries = relationship("TimetableEntry", foreign_keys="TimetableEntry.teacher_id", back_populates="teacher")
    attendance_records = relationship("Attendance", back_populates="teacher")
    preferences    = relationship("TeacherPreference", back_populates="teacher")

# ── TeacherPreference ──────────────────────────────────────────────────────────
class TeacherPreference(Base):
    __tablename__ = "teacher_preferences"
    id            = Column(Integer, primary_key=True, index=True)
    teacher_id    = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day           = Column(String(20)) # Monday, Tuesday, etc.
    preferred_slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=True)
    is_preferred  = Column(Boolean, default=True) # True for preferred, False for "unavailable"
    preference_weight = Column(Integer, default=1) # Weight for GA fitness function

    teacher       = relationship("Teacher", back_populates="preferences")

# ── Teacher-Subject Association ───────────────────────────────────────────────
from sqlalchemy import Table
teacher_subjects = Table(
    "teacher_subjects", Base.metadata,
    Column("teacher_id", Integer, ForeignKey("teachers.id"), primary_key=True),
    Column("subject_id", Integer, ForeignKey("subjects.id"), primary_key=True),
)

# ── Subject ───────────────────────────────────────────────────────────────────
class Subject(Base):
    __tablename__ = "subjects"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(150), nullable=False)
    dept_id    = Column(Integer, ForeignKey("departments.id"))
    semester   = Column(Integer, nullable=True) # Linked to academic year
    credits    = Column(Integer, default=3)
    is_core    = Column(Boolean, default=False)
    required_room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    type       = Column(String(20), default="theory")
    code       = Column(String(20))
    weekly_load= Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department", back_populates="subjects")
    teachers   = relationship("Teacher", secondary="teacher_subjects", back_populates="subjects")
    timetable_entries = relationship("TimetableEntry", back_populates="subject")

# ── Room ──────────────────────────────────────────────────────────────────────
class Room(Base):
    __tablename__ = "rooms"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False, unique=True)
    capacity   = Column(Integer, default=60)
    type       = Column(String(20), default="classroom")
    building   = Column(String(100))
    floor      = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    timetable_entries = relationship("TimetableEntry", back_populates="room")

# ── Class (e.g. CS-A Sem 5) ───────────────────────────────────────────────────
class Class(Base):
    __tablename__ = "classes"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    dept_id    = Column(Integer, ForeignKey("departments.id"))
    semester   = Column(Integer)
    section_code = Column(String(20), default="")
    strength   = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department", back_populates="classes")
    timetable_entries = relationship("TimetableEntry", back_populates="class_")
    batches = relationship("Batch", back_populates="class_")
    students = relationship("Student", back_populates="class_")

# ── Batch ─────────────────────────────────────────────────────────────────────
class Batch(Base):
    __tablename__ = "batches"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(50), nullable=False)
    batch_code = Column(String(10)) # A1, A2, etc.
    class_id   = Column(Integer, ForeignKey("classes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    class_     = relationship("Class", back_populates="batches")
    students   = relationship("Student", back_populates="batch")
    timetable_entries = relationship("TimetableEntry", back_populates="batch")

# ── Student ───────────────────────────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    name       = Column(String(150), nullable=False)
    enrollment_number = Column(String(50), unique=True, index=True)
    class_id   = Column(Integer, ForeignKey("classes.id"))
    batch_id   = Column(Integer, ForeignKey("batches.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user       = relationship("User", backref="student", uselist=False)
    class_     = relationship("Class", back_populates="students")
    batch      = relationship("Batch", back_populates="students")
    attendance_records = relationship("StudentAttendance", back_populates="student")

# ── TimeSlot ──────────────────────────────────────────────────────────────────
class TimeSlot(Base):
    __tablename__ = "time_slots"
    id         = Column(Integer, primary_key=True, index=True)
    label      = Column(String(50), nullable=False)
    slot_index = Column(Integer)
    start_time = Column(String(10))
    end_time   = Column(String(10))

# ── TimetableEntry ────────────────────────────────────────────────────────────
class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    id                   = Column(Integer, primary_key=True, index=True)
    class_id             = Column(Integer, ForeignKey("classes.id"))
    batch_id             = Column(Integer, ForeignKey("batches.id"), nullable=True)
    subject_id           = Column(Integer, ForeignKey("subjects.id"))
    teacher_id           = Column(Integer, ForeignKey("teachers.id"))
    room_id              = Column(Integer, ForeignKey("rooms.id"))
    day                  = Column(String(20), nullable=False)
    time_slot_id         = Column(Integer, ForeignKey("time_slots.id"))
    is_substituted       = Column(Boolean, default=False)
    original_teacher_id  = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    
    subject_shortcode    = Column(String(20))
    faculty_initials     = Column(String(10))
    dept_code            = Column(String(20))
    section_code         = Column(String(20))
    
    semester_year        = Column(String(20), default="2024-25")
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    class_            = relationship("Class", back_populates="timetable_entries")
    batch             = relationship("Batch", back_populates="timetable_entries")
    subject           = relationship("Subject", back_populates="timetable_entries")
    teacher           = relationship("Teacher", foreign_keys=[teacher_id], back_populates="timetable_entries")
    original_teacher  = relationship("Teacher", foreign_keys=[original_teacher_id])
    room              = relationship("Room", back_populates="timetable_entries")
    time_slot         = relationship("TimeSlot")

# ── Attendance ────────────────────────────────────────────────────────────────
class Attendance(Base):
    __tablename__ = "attendance"
    id         = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    date       = Column(Date, nullable=False)
    status     = Column(String(20), default="present")
    marked_at  = Column(DateTime(timezone=True), server_default=func.now())
    teacher    = relationship("Teacher", back_populates="attendance_records")

# ── SubstituteAssignment ──────────────────────────────────────────────────────
class SubstituteAssignment(Base):
    __tablename__ = "substitute_assignments"
    id                      = Column(Integer, primary_key=True, index=True)
    timetable_entry_id      = Column(Integer, ForeignKey("timetable_entries.id"))
    original_teacher_id     = Column(Integer, ForeignKey("teachers.id"))
    substitute_teacher_id   = Column(Integer, ForeignKey("teachers.id"))
    date                    = Column(Date)
    reason                  = Column(Text)
    assigned_at             = Column(DateTime(timezone=True), server_default=func.now())

# ── LeaveRequest ──────────────────────────────────────────────────────────────
class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id         = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    start_date = Column(Date, nullable=False)
    end_date   = Column(Date, nullable=False)
    reason     = Column(Text)
    status     = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    teacher    = relationship("Teacher")

# ── Notice ────────────────────────────────────────────────────────────────────
class Notice(Base):
    __tablename__ = "notices"
    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(200), nullable=False)
    content    = Column(Text, nullable=False)
    target_role= Column(String(20)) # 'all', 'teacher', 'student'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ── StudentAttendance ─────────────────────────────────────────────────────────
class StudentAttendance(Base):
    __tablename__ = "student_attendance"
    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    timetable_entry_id = Column(Integer, ForeignKey("timetable_entries.id"))
    date       = Column(Date, nullable=False)
    status     = Column(String(20), default="present")
    marked_at  = Column(DateTime(timezone=True), server_default=func.now())

    student    = relationship("Student", back_populates="attendance_records")
    timetable_entry = relationship("TimetableEntry")

# ── TeachingAssignment (Source for Requirements) ──────────────────────────────
class TeachingAssignment(Base):
    __tablename__ = "teaching_assignments"
    id         = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    class_id   = Column(Integer, ForeignKey("classes.id"), nullable=False)
    batch_id   = Column(Integer, ForeignKey("batches.id"), nullable=True) # None for Theory
    type       = Column(String(20)) # 'theory' or 'lab'
    weekly_load = Column(Integer, default=3)
    semester_year = Column(String(20), index=True, default="2024-25")

    teacher    = relationship("Teacher")
    subject    = relationship("Subject")
    class_     = relationship("Class")
    batch      = relationship("Batch")
