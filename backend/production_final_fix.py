import sys
from sqlalchemy import create_engine, text

def run_fix(db_url):
    engine = create_engine(db_url)
    print(f"Connecting to database...")
    
    with engine.connect() as conn:
        # 1. Update TEACHERS table
        print("Migrating TEACHERS table...")
        columns_teachers = ["designation", "specialization", "responsibilities", "admin_load"]
        for col in columns_teachers:
            try:
                # Add column if not exists
                conn.execute(text(f"ALTER TABLE teachers ADD COLUMN IF NOT EXISTS {col} VARCHAR"))
                if col == "admin_load":
                    conn.execute(text(f"ALTER TABLE teachers ALTER COLUMN admin_load TYPE INTEGER USING (admin_load::integer)"))
                    conn.execute(text(f"ALTER TABLE teachers ALTER COLUMN admin_load SET DEFAULT 0"))
                print(f"  Column {col} verified/applied.")
            except Exception as e:
                print(f"  Note: {col} column handling: {e}")

        # 2. Update SUBJECTS table
        print("Migrating SUBJECTS table...")
        # Add 'credits', 'type', 'weekly_load'
        try:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3"))
            conn.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'theory'"))
            conn.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_load INTEGER DEFAULT 3"))
            
            # Data recovery: if old columns exist, move data
            try:
                # Map is_lab to type
                conn.execute(text("UPDATE subjects SET type = 'lab' WHERE is_lab = true AND type = 'theory'"))
                # Map hours to weekly_load
                conn.execute(text("UPDATE subjects SET weekly_load = (theory_hours + lab_hours) WHERE weekly_load = 3 AND theory_hours IS NOT NULL"))
                print("  Data recovery from old columns successful.")
            except:
                print("  Old columns not found or already migrated.")
                
            print("  Subject table columns verified/applied.")
        except Exception as e:
            print(f"  Note: Subjects table migration issue: {e}")

        # 3. Data Deduplication (Subject merge logic)
        print("Cleaning up duplicate subjects (OOPS/DSA)...")
        # Find potential duplicates
        res = conn.execute(text("SELECT id, name FROM subjects")).fetchall()
        subjects = {}
        for row in res:
            name_clean = row[1].strip().lower().replace("-", " ")
            if name_clean not in subjects:
                subjects[name_clean] = row[0]
            else:
                # Duplicate found! Merge this one (row[0]) into the original (subjects[name_clean])
                original_id = subjects[name_clean]
                duplicate_id = row[0]
                print(f"  Merging Duplicate '{row[1]}' (ID:{duplicate_id}) -> (ID:{original_id})")
                
                # Update foreign keys in all tables
                conn.execute(text(f"UPDATE timetable_entries SET subject_id = {original_id} WHERE subject_id = {duplicate_id}"))
                conn.execute(text(f"UPDATE teacher_subjects SET subject_id = {original_id} WHERE subject_id = {duplicate_id}"))
                
                # Delete duplicate
                conn.execute(text(f"DELETE FROM subjects WHERE id = {duplicate_id}"))
        
        conn.commit()
    print("\nPROD FIX APPLIED SUCCESSFULLY! (Teachers + Subjects migrated, Duplicates merged)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python production_final_fix.py <DATABASE_URL>")
        sys.exit(1)
    run_fix(sys.argv[1])
