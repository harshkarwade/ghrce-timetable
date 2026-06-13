import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ghrce_v2.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Departments ---")
cursor.execute("SELECT id, name, code FROM departments")
depts = cursor.fetchall()
for d in depts: print(dict(d))

print("\n--- Classes ---")
cursor.execute("SELECT id, name, dept_id, semester FROM classes")
classes = cursor.fetchall()
for c in classes: print(dict(c))

print("\n--- Subjects (Sample) ---")
cursor.execute("SELECT id, name, code, dept_id, type, weekly_load FROM subjects LIMIT 10")
subjs = cursor.fetchall()
for s in subjs: print(dict(s))

print("\n--- Teacher Assignments (Sample) ---")
cursor.execute("""
    SELECT t.name as teacher, s.name as subject, d.code as dept
    FROM teacher_subjects ts
    JOIN teachers t ON ts.teacher_id = t.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN departments d ON s.dept_id = d.id
    LIMIT 20
""")
ts_list = cursor.fetchall()
for ts in ts_list: print(dict(ts))

print("\n--- Time Slots ---")
cursor.execute("SELECT id, label, slot_index FROM time_slots ORDER BY slot_index")
slots = cursor.fetchall()
for s in slots: print(dict(s))

conn.close()
