"""
Recreates the admin user in production with a fresh bcrypt hash.
Run from project root:
  backend\venv\Scripts\python backend\recreate_admin.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from app.core.security import hash_password

PROD_DB_URL = "postgresql://neondb_owner:npg_WN0IRfyjAmY5@ep-summer-voice-am361anj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

ADMIN_EMAIL = "admin@ghrce.edu"
ADMIN_PASS  = "admin123"

engine = create_engine(PROD_DB_URL)

with engine.begin() as conn:
    # Check if admin exists
    existing = conn.execute(text("SELECT id, email FROM users WHERE email = :email"), {"email": ADMIN_EMAIL}).fetchone()
    
    hashed = hash_password(ADMIN_PASS)
    
    if existing:
        # Update the password hash
        conn.execute(text("UPDATE users SET password_hash = :h, role = 'admin', is_active = true WHERE email = :email"),
                     {"h": hashed, "email": ADMIN_EMAIL})
        print(f"Updated admin user: {ADMIN_EMAIL}")
    else:
        # Insert fresh admin
        conn.execute(text("INSERT INTO users (email, password_hash, role, is_active) VALUES (:email, :h, 'admin', true)"),
                     {"email": ADMIN_EMAIL, "h": hashed})
        print(f"Created admin user: {ADMIN_EMAIL}")

    # Verify
    u = conn.execute(text("SELECT id, email, role FROM users WHERE email = :email"), {"email": ADMIN_EMAIL}).fetchone()
    print(f"Admin in DB: id={u[0]}, email={u[1]}, role={u[2]}")

print("Done! Login with admin@ghrce.edu / admin123")
