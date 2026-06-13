import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

def get_initials(name):
    name = name.replace("Dr.", "").replace("Prof.", "").replace(".", "").strip()
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0] + (parts[2][0] if len(parts) > 2 else "")).upper()
    return name[:3].upper()

cur.execute("SELECT id, name FROM teachers")
teachers = cur.fetchall()
for tid, name in teachers:
    print(f"ID: {tid}, Name: {name}, Expected Initials: {get_initials(name)}")

print("\n--- Sample Timetable Entries ---")
cur.execute("SELECT DISTINCT teacher_id, faculty_initials FROM timetable_entries LIMIT 20")
rows = cur.fetchall()
for r in rows:
    print(r)

conn.close()
