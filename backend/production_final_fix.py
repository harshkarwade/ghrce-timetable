"""
Production Maintenance & Migration Script
===========================================
This script performs two critical tasks for the GH Raisoni Timetable live environment:
1. SCHEMA MIGRATION: Adds missing columns (designation, specialization, responsibilities, admin_load) to the 'teachers' table.
2. DATA CLEANUP: Deduplicates subject records (e.g., merging "OOPS-Object Oriented" and "OOPS-Object-oriented").

To run this on your production database:
1. Copy your Neon/PostgreSQL DATABASE_URL from the Render dashboard.
2. Run this command in your terminal:
   python production_final_fix.py "your_database_url_here"
"""
import sys
import re
from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Integer, inspect

def main():
    if len(sys.argv) < 2:
        print("Usage: python production_final_fix.py <DATABASE_URL>")
        sys.exit(1)

    db_url = sys.argv[1]
    engine = create_engine(db_url)
    
    print(f"Connecting to database...")
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('teachers')]
        
        # 1. --- SCHEMA MIGRATION ---
        missing_cols = {
            "designation": "VARCHAR",
            "specialization": "VARCHAR",
            "responsibilities": "VARCHAR",
            "admin_load": "INTEGER DEFAULT 0"
        }
        
        for col, col_type in missing_cols.items():
            if col not in columns:
                print(f"Adding missing column: {col}...")
                conn.execute(text(f"ALTER TABLE teachers ADD COLUMN {col} {col_type}"))
                print(f"  Successfully added {col}")
            else:
                print(f"Column {col} already exists.")
        
        conn.commit()
        print("Schema migration check complete.")

        # 2. --- DATA DEDUPLICATION ---
        print("\nStarting subject deduplication...")
        
        # Helper to normalize names
        def normalize(name):
            return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', name.lower())).strip()

        # Fetch all subjects
        subjects = conn.execute(text("SELECT id, dept_id, type, name FROM subjects")).fetchall()
        
        groups = {}
        for s_id, dept_id, s_type, name in subjects:
            key = (dept_id, s_type, normalize(name))
            groups.setdefault(key, []).append({'id': s_id, 'name': name})

        duplicates_found = False
        for key, group in groups.items():
            if len(group) > 1:
                duplicates_found = True
                # Keep the one with lowest ID
                canonical = min(group, key=lambda x: x['id'])
                dupes = [s for s in group if s['id'] != canonical['id']]
                
                print(f"Merging duplicates for '{key[2]}' (Dept: {key[0]}, Type: {key[1]}):")
                print(f"  KEEP: ID {canonical['id']} ({canonical['name']})")
                
                for d in dupes:
                    print(f"  MERGE+DELETE: ID {d['id']} ({d['name']})")
                    
                    # Point teacher_subject associations to canonical ID
                    conn.execute(text(
                        "UPDATE teacher_subject SET subject_id = :can_id WHERE subject_id = :dup_id "
                        "AND NOT EXISTS (SELECT 1 FROM teacher_subject ts2 WHERE ts2.teacher_id = teacher_subject.teacher_id AND ts2.subject_id = :can_id)"
                    ), {"can_id": canonical['id'], "dup_id": d['id']})
                    
                    # Delete leftover associations for this duplicate
                    conn.execute(text("DELETE FROM teacher_subject WHERE subject_id = :dup_id"), {"dup_id": d['id']})
                    
                    # Re-point timetable entries
                    upd = conn.execute(text(
                        "UPDATE timetable_entries SET subject_id = :can_id WHERE subject_id = :dup_id"
                    ), {"can_id": canonical['id'], "dup_id": d['id']}).rowcount
                    print(f"    - Updated {upd} timetable entries.")
                    
                    # Delete the duplicate subject
                    conn.execute(text("DELETE FROM subjects WHERE id = :dup_id"), {"dup_id": d['id']})
                    print(f"    - Deleted subject ID {d['id']}")

        conn.commit()
        if not duplicates_found:
            print("No duplicate subjects found.")
        else:
            print("\n✅ Deduplication complete.")

    print("\n🎉 ALL PRODUCTION FIXES APPLIED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
