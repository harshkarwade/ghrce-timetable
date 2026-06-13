import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT DISTINCT semester_year FROM timetable_entries")
semesters = cur.fetchall()
print(f"Semesters in DB: {semesters}")

cur.execute("SELECT COUNT(*) FROM timetable_entries")
print(f"Total entries: {cur.fetchone()[0]}")

cur.execute("SELECT teacher_id, COUNT(*) FROM timetable_entries GROUP BY teacher_id LIMIT 10")
print(f"Entries per teacher: {cur.fetchall()}")

conn.close()
