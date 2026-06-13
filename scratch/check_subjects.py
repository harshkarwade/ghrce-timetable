import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Subject Check ---")
cur.execute("SELECT id, name, code, type FROM subjects")
subjects = cur.fetchall()
for s in subjects:
    print(s)

print("\n--- Teacher-Subject Link Check ---")
cur.execute("SELECT teacher_id, subject_id FROM teacher_subjects")
links = cur.fetchall()
for l in links:
    print(l)

conn.close()
