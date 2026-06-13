from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None

# ── Department ────────────────────────────────────────────────────────────────
class DepartmentOut(BaseModel):
    id: int
    name: str
    code: Optional[str]
    class Config: from_attributes = True

# ── Teacher ───────────────────────────────────────────────────────────────────
class TeacherCreate(BaseModel):
    name: str
    dept_id: int
    max_load: int = 18
    designation: Optional[str] = None
    specialization: Optional[str] = None
    responsibilities: Optional[str] = None
    admin_load: int = 0
    avatar: Optional[str] = None
    phone: Optional[str] = None
    subject_ids: List[int] = []
    email: Optional[str] = None
    password: Optional[str] = None

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    dept_id: Optional[int] = None
    max_load: Optional[int] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    responsibilities: Optional[str] = None
    admin_load: Optional[int] = None

class SubjectMini(BaseModel):
    id: int
    name: str
    type: str
    class Config: from_attributes = True

class TeacherOut(BaseModel):
    id: int
    name: str
    dept_id: Optional[int]
    max_load: int
    designation: Optional[str]
    specialization: Optional[str]
    responsibilities: Optional[str]
    admin_load: int
    avatar: Optional[str]
    status: str
    phone: Optional[str]
    subjects: List[SubjectMini] = []
    department: Optional[DepartmentOut] = None
    class Config: from_attributes = True

# ── Subject ───────────────────────────────────────────────────────────────────
class SubjectCreate(BaseModel):
    name: str
    dept_id: int
    credits: int = 3
    type: str = "theory"
    code: Optional[str] = None
    weekly_load: int = 3

class SubjectOut(BaseModel):
    id: int
    name: str
    dept_id: Optional[int]
    credits: int
    type: str
    code: Optional[str]
    weekly_load: int
    department: Optional[DepartmentOut] = None
    class Config: from_attributes = True

# ── Room ──────────────────────────────────────────────────────────────────────
class RoomCreate(BaseModel):
    name: str
    capacity: int = 60
    type: str = "classroom"
    building: Optional[str] = None
    floor: int = 1

class RoomOut(BaseModel):
    id: int
    name: str
    capacity: int
    type: str
    building: Optional[str]
    floor: int
    class Config: from_attributes = True

# ── Timetable ─────────────────────────────────────────────────────────────────
class TimetableEntryOut(BaseModel):
    id: int
    day: str
    is_substituted: bool
    class_: Optional[dict] = None
    batch: Optional[dict] = None
    subject: Optional[SubjectMini] = None
    teacher: Optional[dict] = None
    original_teacher: Optional[dict] = None
    room: Optional[RoomOut] = None
    time_slot: Optional[dict] = None
    
    subject_shortcode: Optional[str] = None
    faculty_initials: Optional[str] = None
    dept_code: Optional[str] = None
    section_code: Optional[str] = None
    
    semester_year: str
    class Config: from_attributes = True

class TimetableEntryCreate(BaseModel):
    class_id: int
    batch_id: Optional[int] = None
    subject_id: int
    teacher_id: int
    room_id: int
    day: str
    time_slot_id: int
    semester_year: str = "2024-25"

class TimetableEntryUpdate(BaseModel):
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    day: Optional[str] = None
    time_slot_id: Optional[int] = None

class GenerateRequest(BaseModel):
    semester_year: str = "2024-25"
    avoid_consecutive: bool = True
    balance_load: bool = True
    labs_afternoon: bool = False
    max_per_day: int = 3
    department_id: Optional[int] = None

# ── Attendance ────────────────────────────────────────────────────────────────
class AttendanceCreate(BaseModel):
    teacher_id: int
    date: date
    status: str

class AttendanceOut(BaseModel):
    id: int
    teacher_id: int
    date: date
    status: str
    marked_at: datetime
    class Config: from_attributes = True

class RescheduleRequest(BaseModel):
    date: date
    day: Optional[str] = None

# ── Analytics ─────────────────────────────────────────────────────────────────
class WorkloadItem(BaseModel):
    teacher_id: int
    teacher_name: str
    avatar: str
    dept: str
    lecture_count: int
    status: str

# ── Batch ─────────────────────────────────────────────────────────────────────
class BatchCreate(BaseModel):
    name: str
    class_id: int

class BatchOut(BaseModel):
    id: int
    name: str
    class_id: int
    class Config: from_attributes = True

# ── Student ───────────────────────────────────────────────────────────────────
class StudentCreate(BaseModel):
    name: str
    enrollment_number: str
    class_id: int
    batch_id: Optional[int] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    enrollment_number: str
    class_id: int
    batch_id: Optional[int]
    class Config: from_attributes = True

# ── LeaveRequest ──────────────────────────────────────────────────────────────
class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str

class LeaveRequestOut(BaseModel):
    id: int
    teacher_id: int
    start_date: date
    end_date: date
    reason: str
    status: str
    created_at: datetime
    class Config: from_attributes = True

class LeaveRequestUpdate(BaseModel):
    status: str # approved, rejected

# ── Notice ────────────────────────────────────────────────────────────────────
class NoticeCreate(BaseModel):
    title: str
    content: str
    target_role: str = "all"

class NoticeOut(BaseModel):
    id: int
    title: str
    content: str
    target_role: str
    created_at: datetime
    class Config: from_attributes = True

# ── Student Attendance ────────────────────────────────────────────────────────
class StudentAttendanceCreate(BaseModel):
    student_id: int
    timetable_entry_id: int
    date: date
    status: str = "present"

class StudentAttendanceOut(BaseModel):
    id: int
    student_id: int
    timetable_entry_id: int
    date: date
    status: str
    marked_at: datetime
    class Config: from_attributes = True
