import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Teacher Check ---")
cur.execute("SELECT id, name, user_id FROM teachers WHERE name LIKE '%Achamma%'")
teacher = cur.fetchone()
print(f"Teacher: {teacher}")

if teacher:
    tid = teacher[0]
    print(f"\n--- Timetable Entries for Teacher ID {tid} ---")
    cur.execute("SELECT COUNT(*) FROM timetable_entries WHERE teacher_id = ?", (tid,))
    print(f"Entries with teacher_id {tid}: {cur.fetchone()[0]}")

    print("\n--- Sample Entries with Faculty Initials 'DAT' ---")
    cur.execute("SELECT id, teacher_id, faculty_initials, day, semester_year FROM timetable_entries WHERE faculty_initials = 'DAT' LIMIT 5")
    rows = cur.fetchall()
    for r in rows:
        print(r)

conn.close()
