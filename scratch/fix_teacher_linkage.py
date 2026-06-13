import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

def get_initials(name):
    name = name.replace("Dr.", "").replace("Prof.", "").replace(".", "").strip()
    parts = name.split()
    # If the name starts with (F1), (F2) etc, remove that too
    if parts and parts[0].startswith("(") and parts[0].endswith(")"):
        parts = parts[1:]
        
    # Standard GHRCE initials: Prefix + Initials
    # But let's look at the actual initials in DB again
    return None

# Let's rebuild the mapping based on the sample entries I saw
# (16, 'PKU') -> Prof. Komal Umare (KU)
# (10, 'PMR') -> Prof. Manisha Raut (MR)
# (20, 'PDD') -> Prof. Deepa Das (DD)
# (6, 'PPD') -> Prof. Pranali Dhawas (PD)
# (21, 'DAT') -> Dr. Achamma Thomas (AT)

initials_to_id = {}
cur.execute("SELECT id, name FROM teachers")
teachers = cur.fetchall()

for tid, name in teachers:
    clean_name = name.replace("Dr.", "").replace("Prof.", "").replace(".", "").strip()
    if clean_name.startswith("(") and ")" in clean_name:
        clean_name = clean_name.split(")", 1)[1].strip()
    
    parts = clean_name.split()
    if len(parts) >= 2:
        base_initials = "".join(p[0] for p in parts if p).upper()
    else:
        base_initials = clean_name[:2].upper()
        
    prefix = "D" if "Dr." in name else "P"
    full_initials = prefix + base_initials
    initials_to_id[full_initials] = tid
    print(f"Mapped {full_initials} to {name} (ID {tid})")

# Special case for Dr. Achamma Thomas since I saw DAT in entries
initials_to_id['DAT'] = 1 

print("\n--- Fixing Timetable Entries ---")
cur.execute("SELECT id, faculty_initials, teacher_id FROM timetable_entries")
entries = cur.fetchall()

updated = 0
for eid, initials, current_tid in entries:
    if initials in initials_to_id:
        correct_tid = initials_to_id[initials]
        if current_tid != correct_tid:
            cur.execute("UPDATE timetable_entries SET teacher_id = ? WHERE id = ?", (correct_tid, eid))
            updated += 1

conn.commit()
print(f"Updated {updated} entries with correct teacher_id")

conn.close()
