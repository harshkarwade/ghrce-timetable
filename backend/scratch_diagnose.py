import sqlite3
import collections

db_path = r'c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Rooms ---")
cursor.execute("SELECT id, name, type, capacity FROM rooms")
rooms = cursor.fetchall()
for r in rooms: print(dict(r))

print("\n--- Room Types Distribution ---")
types = collections.Counter(r['type'] for r in rooms)
print(types)

print("\n--- Teacher Load Limits ---")
cursor.execute("SELECT id, name, max_load FROM teachers")
teachers = cursor.fetchall()
for t in teachers: 
    if t['max_load'] is not None and t['max_load'] != 18:
        print(dict(t))

print("\n--- Subjects Count by Type ---")
cursor.execute("SELECT type, COUNT(*) as count FROM subjects GROUP BY type")
for row in cursor.fetchall(): print(dict(row))

conn.close()
