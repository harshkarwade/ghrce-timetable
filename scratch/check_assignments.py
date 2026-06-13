import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Teaching Assignments ---")
cur.execute("""
    SELECT ta.id, ta.teacher_id, t.name, ta.subject_id, s.name, ta.semester_year 
    FROM teaching_assignments ta
    JOIN teachers t ON t.id = ta.teacher_id
    JOIN subjects s ON s.id = ta.subject_id
    LIMIT 20
""")
rows = cur.fetchall()
for r in rows:
    print(r)

conn.close()
