"""
clean_sync_to_production.py

Re-seeds production DB with all data from local SQLite.

Run from project root:
  backend\venv\Scripts\python backend\clean_sync_to_production.py
"""
import sqlite3
import os

PROD_DB_URL = "postgresql://neondb_owner:npg_WN0IRfyjAmY5@ep-summer-voice-am361anj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
LOCAL_DB    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ghrce_v2.db")

from sqlalchemy import create_engine, text

def run():
    engine = create_engine(PROD_DB_URL)
    
    # --- Read ALL local data first ---
    sqlite_conn = sqlite3.connect(LOCAL_DB)
    sqlite_conn.row_factory = sqlite3.Row
    
    def q(sql):
        return [dict(r) for r in sqlite_conn.execute(sql).fetchall()]

    print("Reading local data...")
    departments = q("SELECT id, name, code FROM departments")
    rooms       = q("SELECT id, name, capacity, type, building, floor FROM rooms")
    time_slots  = q("SELECT id, label, slot_index, start_time, end_time FROM time_slots ORDER BY slot_index")
    users       = q("SELECT id, email, password_hash, role, is_active FROM users")
    
    # Get teacher columns dynamically
    tcols = [r[1] for r in sqlite_conn.execute("PRAGMA table_info(teachers)").fetchall()]
    keep_t = [c for c in ["id","user_id","name","dept_id","max_load","designation","specialization","responsibilities","admin_load","avatar","status","phone"] if c in tcols]
    teachers = q(f"SELECT {', '.join(keep_t)} FROM teachers")
    for r in teachers:
        r.setdefault("designation", None)
        r.setdefault("specialization", None)
        r.setdefault("responsibilities", None)
        r.setdefault("admin_load", 0)

    # Get subject columns dynamically
    scols = [r[1] for r in sqlite_conn.execute("PRAGMA table_info(subjects)").fetchall()]
    keep_s = [c for c in ["id","name","dept_id","credits","type","code","weekly_load"] if c in scols]
    subjects = q(f"SELECT {', '.join(keep_s)} FROM subjects")
    for r in subjects:
        if not r.get("credits"): r["credits"] = 3
        if not r.get("weekly_load"): r["weekly_load"] = 3
        if not r.get("type"): r["type"] = "theory"

    # Get class columns dynamically
    ccols = [r[1] for r in sqlite_conn.execute("PRAGMA table_info(classes)").fetchall()]
    keep_c = [c for c in ["id","name","dept_id","semester","strength"] if c in ccols]
    classes  = q(f"SELECT {', '.join(keep_c)} FROM classes")
    for r in classes:
        if not r.get("strength"): r["strength"] = 60

    ts_links = q("SELECT teacher_id, subject_id FROM teacher_subjects")
    sqlite_conn.close()

    print(f"  {len(departments)} depts, {len(teachers)} teachers, {len(subjects)} subjects, {len(classes)} classes, {len(users)} users")

    # --- Write to production in separate transactions per table ---
    def do_table(table_name, rows, cols=None):
        if not rows: return 0
        if cols is None: cols = list(rows[0].keys())
        col_str = ", ".join(cols)
        val_str = ", ".join(f":{c}" for c in cols)
        sql = f"INSERT INTO {table_name} ({col_str}) VALUES ({val_str}) ON CONFLICT (id) DO NOTHING"
        count = 0
        with engine.begin() as pg:
            for r in rows:
                try:
                    pg.execute(text(sql), {k: r.get(k) for k in cols})
                    count += 1
                except Exception as e:
                    print(f"  Warning [{table_name}]: {e}")
        return count

    print("\nClearing production (TRUNCATE CASCADE)...")
    with engine.begin() as pg:
        pg.execute(text("TRUNCATE departments, rooms, time_slots, subjects, classes, teacher_subjects, teachers, users RESTART IDENTITY CASCADE"))
    print("  Cleared.\n")

    print("Inserting...")
    print(f"  departments: {do_table('departments', departments)}")
    print(f"  rooms:       {do_table('rooms', rooms)}")
    print(f"  time_slots:  {do_table('time_slots', time_slots)}")
    
    # Users - use ON CONFLICT (email) instead of id
    count = 0
    with engine.begin() as pg:
        for r in users:
            try:
                pg.execute(text("INSERT INTO users (id, email, password_hash, role, is_active) VALUES (:id, :email, :password_hash, :role, :is_active) ON CONFLICT (email) DO NOTHING"), r)
                count += 1
            except Exception as e:
                print(f"  Warning [users] {r.get('email')}: {e}")
    print(f"  users:       {count}")

    print(f"  teachers:    {do_table('teachers', teachers, keep_t)}")
    print(f"  subjects:    {do_table('subjects', subjects, keep_s)}")
    print(f"  classes:     {do_table('classes', classes, keep_c)}")

    # Teacher-Subject links
    count = 0
    with engine.begin() as pg:
        for r in ts_links:
            try:
                pg.execute(text("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (:teacher_id, :subject_id) ON CONFLICT DO NOTHING"), r)
                count += 1
            except: pass
    print(f"  teacher_subjects: {count}")

    # Reset sequences after inserting with explicit IDs
    print("\nResetting sequences...")
    with engine.begin() as pg:
        for t, c in [("departments","id"),("rooms","id"),("time_slots","id"),
                      ("users","id"),("teachers","id"),("subjects","id"),("classes","id")]:
            try:
                pg.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}', '{c}'), COALESCE(MAX({c}), 1)) FROM {t}"))
            except Exception as e:
                print(f"  Warn {t}: {e}")

    print("\n== Final Row Counts ==")
    with engine.connect() as pg:
        for t in ["departments","teachers","subjects","classes","rooms","time_slots","users"]:
            n = pg.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  {t}: {n}")

    print("\n🎉 SYNC COMPLETE!")

if __name__ == "__main__":
    run()
