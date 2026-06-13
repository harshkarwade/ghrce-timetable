"""
Creates user accounts for all teachers in production DB.
Default password for all teachers: Teacher@123
Run: backend\venv\Scripts\python backend\create_teacher_users.py
"""
import bcrypt
from sqlalchemy import create_engine, text

PROD_DB_URL = "sqlite:///c:/Users/ASUS/Downloads/GHRCE-AI-Timetable-v3/ghrce-timetable/backend/ghrce_v2.db"
DEFAULT_PASSWORD = "Teacher@123"

engine = create_engine(PROD_DB_URL)

with engine.connect() as conn:
    teachers = conn.execute(text(
        "SELECT id, name, user_id FROM teachers WHERE user_id IS NULL ORDER BY id"
    )).fetchall()
    print(f"Teachers without login accounts: {len(teachers)}")

password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt()).decode()

created = 0
skipped = 0

with engine.begin() as conn:
    for t_id, name, user_id in teachers:
        # Generate email from name e.g. "Dr. Achamma Thomas" -> achamma.thomas@ghrce.edu
        parts = name.lower().replace("dr.", "").replace("prof.", "").replace(".", "").strip().split()
        if len(parts) >= 2:
            email = f"{parts[0]}.{parts[-1]}@ghrce.edu"
        else:
            email = f"{parts[0]}@ghrce.edu"

        # Check if user already exists
        existing = conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email}).fetchone()
        if existing:
            conn.execute(text("UPDATE teachers SET user_id = :uid WHERE id = :tid"),
                         {"uid": existing.id, "tid": t_id})
            skipped += 1
            continue

        # Create user
        result = conn.execute(text(
            "INSERT INTO users (email, password_hash, role, is_active) VALUES (:e, :p, 'teacher', true) RETURNING id"
        ), {"e": email, "p": password_hash})
        new_uid = result.fetchone()[0]

        # Link teacher -> user
        conn.execute(text("UPDATE teachers SET user_id = :uid WHERE id = :tid"),
                     {"uid": new_uid, "tid": t_id})
        print(f"  Created: {email}  ({name})")
        created += 1

print(f"\nCreated {created} new teacher accounts")
print(f"Skipped {skipped} (user already existed)")
print(f"Default password: {DEFAULT_PASSWORD}")

# Print final list
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT t.name, u.email FROM teachers t JOIN users u ON u.id = t.user_id ORDER BY t.name"
    )).fetchall()
    print(f"\n=== Teacher Login Accounts ({len(rows)}) ===")
    for name, email in rows:
        print(f"  {email}  |  {name}")
