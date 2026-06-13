import sqlite3
import os

db_path = r'c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Duplicate Batches (Name + ClassID) ---")
query = "SELECT name, class_id, COUNT(*) FROM batches GROUP BY name, class_id HAVING COUNT(*) > 1"
cursor.execute(query)
print(cursor.fetchall())

print("\n--- Duplicate Subjects (Code) ---")
query = "SELECT code, COUNT(*) FROM subjects GROUP BY code HAVING COUNT(*) > 1"
cursor.execute(query)
print(cursor.fetchall())

print("\n--- Timetable Entry Count ---")
query = "SELECT COUNT(*) FROM timetable_entries"
cursor.execute(query)
print(cursor.fetchone()[0])

print("\n--- Overlapping Batch Entries (Monday Slot 5) ---")
query = """
SELECT te.id, b.name, r.name, s.name
FROM timetable_entries te
JOIN batches b ON te.batch_id = b.id
JOIN rooms r ON te.room_id = r.id
JOIN subjects s ON te.subject_id = s.id
JOIN time_slots ts ON te.time_slot_id = ts.id
WHERE te.day = 'Monday' AND ts.slot_index = 5
"""
cursor.execute(query)
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
