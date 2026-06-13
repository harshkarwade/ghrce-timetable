import sqlite3
import bcrypt
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"
DEFAULT_PASSWORD = "teacher123"

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get teachers without user accounts
cur.execute("SELECT id, name FROM teachers WHERE user_id IS NULL")
teachers = cur.fetchall()
print(f"Teachers without login accounts: {len(teachers)}")

if len(teachers) == 0:
    print("No teachers to create accounts for.")
    conn.close()
    exit(0)

# Hash password
password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt()).decode()

created = 0
skipped = 0

for t_id, name in teachers:
    # Generate email from name e.g. "Dr. Achamma Thomas" -> achamma.thomas@ghrce.edu
    parts = name.lower().replace("dr.", "").replace("prof.", "").replace(".", "").strip().split()
    if len(parts) >= 2:
        email = f"{parts[0]}.{parts[-1]}@ghrce.edu"
    else:
        email = f"{parts[0]}@ghrce.edu"

    # Check if user already exists
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = cur.fetchone()
    
    if existing:
        user_id = existing[0]
        cur.execute("UPDATE teachers SET user_id = ? WHERE id = ?", (user_id, t_id))
        skipped += 1
        continue

    # Create user
    try:
        cur.execute(
            "INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'teacher', 1)",
            (email, password_hash)
        )
        new_uid = cur.lastrowid

        # Link teacher -> user
        cur.execute("UPDATE teachers SET user_id = ? WHERE id = ?", (new_uid, t_id))
        print(f"  Created: {email}  ({name})")
        created += 1
    except Exception as e:
        print(f"  Error creating {email}: {e}")

conn.commit()
conn.close()

print(f"\nCreated {created} new teacher accounts")
print(f"Skipped {skipped} (user already existed)")
print(f"Default password: {DEFAULT_PASSWORD}")
