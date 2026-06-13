import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Database Status ---")

# Check users
cur.execute("SELECT COUNT(*) FROM users")
print(f"Users: {cur.fetchone()[0]}")

cur.execute("SELECT id, email, role FROM users")
for row in cur.fetchall():
    print(f"  User: {row}")

# Check teachers
cur.execute("SELECT COUNT(*) FROM teachers")
print(f"Teachers: {cur.fetchone()[0]}")

cur.execute("SELECT id, name, user_id FROM teachers LIMIT 10")
for row in cur.fetchall():
    print(f"  Teacher: {row}")

conn.close()
