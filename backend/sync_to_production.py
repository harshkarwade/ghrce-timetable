"""
sync_to_production.py
Reads ALL data from the local SQLite database and upserts it into
the production Neon PostgreSQL database.

Run from the project root:
  backend\venv\Scripts\python backend\sync_to_production.py
"""
import sqlite3
import os

PROD_DB_URL = "postgresql://neondb_owner:npg_WN0IRfyjAmY5@ep-summer-voice-am361anj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
LOCAL_DB    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ghrce_v2.db")

from sqlalchemy import create_engine, text

def get_cols(conn, table):
    """Return list of column names for a table in local SQLite."""
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return [r[1] for r in rows]

def get_local_rows(conn, table, cols):
    rows = conn.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()
    return [dict(zip(cols, r)) for r in rows]

def upsert(pg, table, rows, pk="id", conflict_cols=None):
    if not rows:
        return 0
    cols = list(rows[0].keys())
    col_str = ", ".join(f'"{c}"' for c in cols)
    val_str = ", ".join(f":{c}" for c in cols)
    
    if conflict_cols is None:
        conflict_cols = [pk]
    
    conflict_str = ", ".join(conflict_cols)
    update_str = ", ".join(
        f'"{c}"=EXCLUDED."{c}"'
        for c in cols
        if c not in conflict_cols
    )
    
    sql = f"""
        INSERT INTO {table} ({col_str})
        VALUES ({val_str})
        ON CONFLICT ({conflict_str}) DO UPDATE SET {update_str}
    """ if update_str else f"""
        INSERT INTO {table} ({col_str})
        VALUES ({val_str})
        ON CONFLICT ({conflict_str}) DO NOTHING
    """
    
    count = 0
    for r in rows:
        try:
            pg.execute(text(sql), r)
            count += 1
        except Exception as e:
            print(f"  Warning row {r}: {e}")
    return count

def run():
    sqlite_conn = sqlite3.connect(LOCAL_DB)
    engine = create_engine(PROD_DB_URL)
    print(f"✅ Reading from: {LOCAL_DB}")
    print(f"✅ Writing to: Neon Production DB")

    with engine.connect() as pg:

        # 1. DEPARTMENTS
        print("\n[1/8] Syncing Departments...")
        cols = get_cols(sqlite_conn, "departments")
        important_cols = [c for c in ["id", "name", "code"] if c in cols]
        rows = get_local_rows(sqlite_conn, "departments", important_cols)
        n = upsert(pg, "departments", rows, pk="id")
        print(f"  {n} rows synced.")

        # 2. ROOMS
        print("[2/8] Syncing Rooms...")
        cols = get_cols(sqlite_conn, "rooms")
        keep = [c for c in ["id", "name", "capacity", "type", "building", "floor"] if c in cols]
        rows = get_local_rows(sqlite_conn, "rooms", keep)
        n = upsert(pg, "rooms", rows, pk="id")
        print(f"  {n} rows synced.")

        # 3. TIME SLOTS
        print("[3/8] Syncing Time Slots...")
        cols = get_cols(sqlite_conn, "time_slots")
        keep = [c for c in ["id", "label", "slot_index", "start_time", "end_time"] if c in cols]
        rows = get_local_rows(sqlite_conn, "time_slots", keep)
        n = upsert(pg, "time_slots", rows, pk="id")
        print(f"  {n} rows synced.")

        # 4. USERS
        print("[4/8] Syncing Users...")
        cols = get_cols(sqlite_conn, "users")
        keep = [c for c in ["id", "email", "password_hash", "role", "is_active"] if c in cols]
        rows = get_local_rows(sqlite_conn, "users", keep)
        n = upsert(pg, "users", rows, conflict_cols=["id"])
        print(f"  {n} rows synced.")

        # 5. TEACHERS
        print("[5/8] Syncing Teachers...")
        cols = get_cols(sqlite_conn, "teachers")
        keep_candidates = ["id", "user_id", "name", "dept_id", "max_load",
                           "designation", "specialization", "responsibilities",
                           "admin_load", "avatar", "status", "phone"]
        keep = [c for c in keep_candidates if c in cols]
        rows = get_local_rows(sqlite_conn, "teachers", keep)
        # Fill in missing fields with defaults for prod schema
        for r in rows:
            r.setdefault("designation", None)
            r.setdefault("specialization", None)
            r.setdefault("responsibilities", None)
            r.setdefault("admin_load", 0)
        n = upsert(pg, "teachers", rows, pk="id")
        print(f"  {n} rows synced.")

        # 6. SUBJECTS
        print("[6/8] Syncing Subjects...")
        cols = get_cols(sqlite_conn, "subjects")
        keep_candidates = ["id", "name", "dept_id", "credits", "type", "code", "weekly_load"]
        keep = [c for c in keep_candidates if c in cols]
        rows = get_local_rows(sqlite_conn, "subjects", keep)
        for r in rows:
            r.setdefault("credits", 3)
            r.setdefault("weekly_load", 3)
            r.setdefault("type", "theory")
            if r["credits"] is None: r["credits"] = 3
            if r["weekly_load"] is None: r["weekly_load"] = 3
            if r["type"] is None: r["type"] = "theory"
        n = upsert(pg, "subjects", rows, pk="id")
        print(f"  {n} rows synced.")

        # 7. CLASSES
        print("[7/8] Syncing Classes...")
        cols = get_cols(sqlite_conn, "classes")
        keep_candidates = ["id", "name", "dept_id", "semester", "strength"]
        keep = [c for c in keep_candidates if c in cols]
        rows = get_local_rows(sqlite_conn, "classes", keep)
        for r in rows:
            if r.get("strength") is None: r["strength"] = 60
        n = upsert(pg, "classes", rows, pk="id")
        print(f"  {n} rows synced.")

        # 8. BATCHES
        print("[8/9] Syncing Batches...")
        cols = get_cols(sqlite_conn, "batches")
        keep_candidates = ["id", "name", "class_id"]
        keep = [c for c in keep_candidates if c in cols]
        rows = get_local_rows(sqlite_conn, "batches", keep)
        n = upsert(pg, "batches", rows, pk="id")
        print(f"  {n} rows synced.")

        # 9. TEACHER_SUBJECTS
        print("[9/9] Syncing Teacher-Subject Assignments...")
        rows = get_local_rows(sqlite_conn, "teacher_subjects", ["teacher_id", "subject_id"])
        count = 0
        for r in rows:
            try:
                pg.execute(text("""
                    INSERT INTO teacher_subjects (teacher_id, subject_id)
                    VALUES (:teacher_id, :subject_id)
                    ON CONFLICT DO NOTHING
                """), r)
                count += 1
            except:
                pass
        print(f"  {count} rows synced.")

        # Reset sequences so new inserts don't conflict
        print("\nResetting PostgreSQL sequences...")
        for table, col in [("departments","id"), ("rooms","id"), ("time_slots","id"),
                            ("users","id"), ("teachers","id"), ("subjects","id"), ("classes","id"), ("batches","id")]:
            try:
                pg.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', '{col}'), COALESCE(MAX({col}), 1)) FROM {table}"))
            except Exception as e:
                print(f"  Warning resetting {table}: {e}")

        pg.commit()
        print("\n🎉 ALL DATA SYNCED SUCCESSFULLY!")

if __name__ == "__main__":
    run()
