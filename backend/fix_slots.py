"""
Fix: Remove 05:30 PM-06:30 PM time slot (college hours are 9:30 AM - 5:30 PM).
Clears all timetable entries so a fresh generation can be triggered.
"""
import sqlite3

DB = r'backend/ghrce_v2.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=== Fixing time slots (removing 05:30 PM slot) ===")

# 1. Get the slot id to remove
c.execute("SELECT id, label FROM time_slots WHERE label LIKE '05:30%'")
bad_slot = c.fetchone()
if bad_slot:
    bad_id = bad_slot['id']
    print(f"Found slot to remove: id={bad_id} label={bad_slot['label']}")
    
    # 2. Delete timetable entries that use this slot (cascade)
    c.execute("SELECT COUNT(*) as cnt FROM timetable_entries WHERE time_slot_id=?", (bad_id,))
    cnt = c.fetchone()['cnt']
    print(f"Removing {cnt} timetable entries for this slot...")
    
    # Delete student_attendance entries referencing these timetable entries
    c.execute("""DELETE FROM student_attendance WHERE timetable_entry_id IN 
                 (SELECT id FROM timetable_entries WHERE time_slot_id=?)""", (bad_id,))
    c.execute("""DELETE FROM substitute_assignments WHERE timetable_entry_id IN 
                 (SELECT id FROM timetable_entries WHERE time_slot_id=?)""", (bad_id,))
    c.execute("DELETE FROM timetable_entries WHERE time_slot_id=?", (bad_id,))
    
    # 3. Delete the slot itself
    c.execute("DELETE FROM time_slots WHERE id=?", (bad_id,))
    print(f"Deleted slot id={bad_id}")
else:
    print("No 05:30 PM slot found - already clean.")

# 4. Also clear ALL remaining timetable entries so fresh generation can run
c.execute("SELECT COUNT(*) as cnt FROM timetable_entries")
remaining = c.fetchone()['cnt']
print(f"\nClearing all {remaining} remaining timetable entries for fresh generation...")
c.execute("DELETE FROM student_attendance")
c.execute("DELETE FROM substitute_assignments")
c.execute("DELETE FROM timetable_entries")
print("Done. Timetable cleared.")

conn.commit()
conn.close()

print("\n=== Final time slots ===")
conn2 = sqlite3.connect(DB)
conn2.row_factory = sqlite3.Row
for s in conn2.execute("SELECT id, label, slot_index FROM time_slots ORDER BY slot_index"):
    print(f"  id={s['id']}  idx={s['slot_index']}  label={s['label']}")
conn2.close()

print("\nDone! Now trigger a fresh timetable generation from the UI.")
