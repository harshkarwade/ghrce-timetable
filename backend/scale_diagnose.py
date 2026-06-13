import sqlite3
import collections

db_path = r'c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Stats ---")
cursor.execute("SELECT COUNT(*) FROM classes")
print(f"Total Classes: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM subjects")
print(f"Total Subjects: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM teachers")
print(f"Total Teachers: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM rooms")
print(f"Total Rooms: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM teacher_subjects")
print(f"Total Teacher-Subject Assignments: {cursor.fetchone()[0]}")

print("\n--- Rooms Detail ---")
cursor.execute("SELECT name, type FROM rooms")
for r in cursor.fetchall():
    print(f"Room: {r['name']} ({r['type']})")

print("\n--- Classes per Department ---")
cursor.execute("SELECT d.code, COUNT(c.id) FROM classes c JOIN departments d ON c.dept_id = d.id GROUP BY d.code")
for row in cursor.fetchall(): print(dict(row))

print("\n--- Teacher Assignment Breakdown (First 10) ---")
cursor.execute("""
    SELECT t.name, COUNT(ts.subject_id) as count 
    FROM teachers t 
    JOIN teacher_subjects ts ON t.id = ts.teacher_id 
    GROUP BY t.id 
    ORDER BY count DESC 
    LIMIT 10
""")
for row in cursor.fetchall(): print(dict(row))

conn.close()
