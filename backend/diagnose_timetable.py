import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ghrce_v2.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Monday 01:30 PM (Slot 5) Entries ---")
query = """
SELECT te.id, c.name, b.name, s.name, t.name, r.name, te.day, ts.label
FROM timetable_entries te
JOIN classes c ON te.class_id = c.id
LEFT JOIN batches b ON te.batch_id = b.id
JOIN subjects s ON te.subject_id = s.id
JOIN teachers t ON te.teacher_id = t.id
JOIN rooms r ON te.room_id = r.id
JOIN time_slots ts ON te.time_slot_id = ts.id
WHERE te.day = 'Monday' AND ts.slot_index = 5
"""
cursor.execute(query)
rows = cursor.fetchall()
for row in rows:
    print(row)

print("\n--- Batch B3 Total Load per Day ---")
query = """
SELECT te.day, COUNT(*) as slots
FROM timetable_entries te
JOIN batches b ON te.batch_id = b.id
WHERE b.name LIKE '%B3%'
GROUP BY te.day
"""
cursor.execute(query)
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
