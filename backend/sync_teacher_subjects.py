"""
Syncs teacher_subjects links from local SQLite to production Neon DB.
"""
import sqlite3, os
from sqlalchemy import create_engine, text

PROD_DB_URL = "postgresql://neondb_owner:npg_WN0IRfyjAmY5@ep-summer-voice-am361anj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
LOCAL_DB    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ghrce_v2.db")

print("Checking local DB...")
sqlite_conn = sqlite3.connect(LOCAL_DB)
# Check table exists
tables = sqlite_conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_subjects'").fetchall()
if not tables:
    print("Error: teacher_subjects table not found in local DB.")
    sqlite_conn.close()
    exit(1)

links = sqlite_conn.execute("SELECT teacher_id, subject_id FROM teacher_subjects").fetchall()
sqlite_conn.close()

print(f"Found {len(links)} teacher-subject links in local DB")

# Use pool_pre_ping to handle dropped connections
engine = create_engine(PROD_DB_URL, pool_pre_ping=True, connect_args={'connect_timeout': 30})

with engine.connect() as conn:
    prod_teachers = set(r[0] for r in conn.execute(text("SELECT id FROM teachers")).fetchall())
    prod_subjects = set(r[0] for r in conn.execute(text("SELECT id FROM subjects")).fetchall())
    existing = set(
        (r[0], r[1]) for r in conn.execute(text("SELECT teacher_id, subject_id FROM teacher_subjects")).fetchall()
    )
    print(f"Production Status: {len(prod_teachers)} teachers, {len(prod_subjects)} subjects, {len(existing)} existing links")

inserted = 0
skipped_missing = 0
skipped_exists = 0

print("Syncing...")
with engine.begin() as conn:
    for t_id, s_id in links:
        if t_id not in prod_teachers or s_id not in prod_subjects:
            skipped_missing += 1
            continue
        if (t_id, s_id) in existing:
            skipped_exists += 1
            continue
        try:
            conn.execute(text(
                "INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (:t, :s)"
            ), {"t": t_id, "s": s_id})
            inserted += 1
        except Exception as e:
            print(f"  Error for ({t_id},{s_id}): {e}")

print(f"\nFinal Sync Result:")
print(f"✅ Inserted: {inserted}")
print(f"   Skipped (already exists): {skipped_exists}")
print(f"   Skipped (missing in prod): {skipped_missing}")

with engine.connect() as conn:
    total = conn.execute(text("SELECT COUNT(*) FROM teacher_subjects")).scalar()
    covered = conn.execute(text("SELECT COUNT(DISTINCT subject_id) FROM teacher_subjects")).scalar()
    print(f"Final Count: {total} teacher-subject links in production")
    print(f"Coverage: {covered} subjects have at least one teacher")
