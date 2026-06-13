-- GHRCE AI Timetable Management System - Database Schema (PostgreSQL)
-- Final Submission Specification v1.0

-- 1. Departments
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE -- CS/AI/CSE-AI/CSE-AIML
);

-- 2. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'hod')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Teachers
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    max_hours_week INTEGER DEFAULT 16,
    status VARCHAR(20) DEFAULT 'present', -- present/absent
    avatar VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Subjects
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE,
    department_id INTEGER REFERENCES departments(id),
    type VARCHAR(20) CHECK (type IN ('theory', 'lab')),
    credits INTEGER DEFAULT 3,
    weekly_load INTEGER DEFAULT 3
);

-- 5. Teacher-Subject Association (Many-to-Many)
CREATE TABLE teacher_subjects (
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- 6. Rooms
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) CHECK (type IN ('classroom', 'lab')),
    capacity INTEGER DEFAULT 60,
    floor INTEGER DEFAULT 1
);

-- 7. Classes
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g. AI-SC-S5
    section VARCHAR(10),
    semester INTEGER,
    department_id INTEGER REFERENCES departments(id),
    student_count INTEGER DEFAULT 60
);

-- 8. Time Slots
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_number INTEGER
);

-- 9. Timetable Entries (Core Schedule)
CREATE TABLE timetable_entries (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES time_slots(id) ON DELETE CASCADE,
    week_number INTEGER DEFAULT 1,
    is_substituted BOOLEAN DEFAULT FALSE,
    original_teacher_id INTEGER REFERENCES teachers(id),
    semester_year VARCHAR(20) DEFAULT '2024-25',
    
    -- CONSTRAINTS: Prevent collisions
    CONSTRAINT unique_teacher_slot UNIQUE (teacher_id, time_slot_id, week_number),
    CONSTRAINT unique_room_slot UNIQUE (room_id, time_slot_id, week_number)
);

-- 10. Leave Requests
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' -- pending/approved/rejected
);

-- 11. Substitutions
CREATE TABLE substitutions (
    id SERIAL PRIMARY KEY,
    original_teacher_id INTEGER REFERENCES teachers(id),
    substitute_teacher_id INTEGER REFERENCES teachers(id),
    timetable_entry_id INTEGER REFERENCES timetable_entries(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Attendance
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES
CREATE INDEX idx_timetable_teacher ON timetable_entries(teacher_id);
CREATE INDEX idx_timetable_room ON timetable_entries(room_id);
CREATE INDEX idx_teacher_dept ON teachers(department_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- 13. SQL VIEWS (Section 5 Requirements)

-- View 1: Teacher Workload Summary
CREATE VIEW teacher_workload_summary AS
SELECT 
    t.id AS teacher_id,
    t.name AS teacher_name,
    d.name AS department,
    COUNT(te.id) AS assigned_hours,
    t.max_hours_week AS max_hours,
    CASE 
        WHEN COUNT(te.id) > t.max_hours_week THEN 'Overloaded'
        WHEN COUNT(te.id) < (t.max_hours_week / 2) THEN 'Underloaded'
        ELSE 'Normal'
    END AS workload_status
FROM teachers t
JOIN departments d ON t.department_id = d.id
LEFT JOIN timetable_entries te ON t.id = te.teacher_id
GROUP BY t.id, t.name, d.name, t.max_hours_week;

-- View 2: Room Utilization Weekly (%)
CREATE VIEW room_utilization_weekly AS
SELECT 
    r.id AS room_id,
    r.name AS room_name,
    r.type AS room_type,
    (COUNT(te.id) * 100.0 / 40.0) AS utilization_pct -- Assuming 40 slots per week
FROM rooms r
LEFT JOIN timetable_entries te ON r.id = te.room_id
GROUP BY r.id, r.name, r.type;

-- View 3: Department Lecture Count
CREATE VIEW department_lecture_count AS
SELECT 
    d.name AS department_name,
    COUNT(te.id) AS total_lectures
FROM departments d
JOIN classes c ON d.id = c.department_id
JOIN timetable_entries te ON c.id = te.class_id
GROUP BY d.name;


-- SAMPLE SEED DATA
INSERT INTO departments (name, code) VALUES 
('Computer Science', 'CS'),
('Dept of AI', 'AI'),
('Dept of CSE-AI', 'CSE-AI'),
('Dept of CSE-AIML', 'CSE-AIML');

INSERT INTO rooms (name, type, capacity) VALUES 
('CR-101', 'classroom', 60),
('CR-102', 'classroom', 60),
('CR-103', 'classroom', 60),
('LAB-201', 'lab', 30),
('LAB-202', 'lab', 30);
