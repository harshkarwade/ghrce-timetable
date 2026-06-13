"""
End-to-end generation test against the local SQLite DB.
Runs Phase 1 only (CSP), prints progress, and reports results.
"""
import sys, sqlite3, collections, time
sys.path.insert(0, 'backend')
from app.services.ai_engine import TimetableEngine, ScheduleResult

DB = r'backend/ghrce_v2.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

def rows(q, *args):
    c.execute(q, args)
    return [dict(r) for r in c.fetchall()]

classes   = rows("SELECT id, name, dept_id, semester FROM classes")
batches   = rows("SELECT id, name, class_id FROM batches")
subjects  = rows("SELECT id, name, code, dept_id, type, weekly_load, semester FROM subjects")
rooms     = rows("SELECT id, name, type FROM rooms")
slots     = rows("SELECT id, label, slot_index FROM time_slots ORDER BY slot_index")
teachers_raw = rows("SELECT id, name, dept_id, status, max_load FROM teachers")

# Attach subject_ids to each teacher
teacher_subj = collections.defaultdict(list)
for row in rows("SELECT teacher_id, subject_id FROM teacher_subjects"):
    teacher_subj[row['teacher_id']].append(row['subject_id'])

teachers = []
for t in teachers_raw:
    t['subject_ids'] = teacher_subj[t['id']]
    t['preferences'] = []
    teachers.append(t)

conn.close()

print(f"Data loaded: {len(classes)} classes, {len(batches)} batches, "
      f"{len(subjects)} subjects, {len(rooms)} rooms, "
      f"{len(slots)} slots, {len(teachers)} teachers")

engine = TimetableEngine({"max_per_day": 6})

print("\n=== Running generation (Phase 1 pre-flight + CSP) ===")
t0 = time.time()

result = engine.generate(
    classes=classes, batches=batches, teachers=teachers,
    subjects=subjects, rooms=rooms, time_slots=slots,
    semester_year="2024-25"
)

elapsed = time.time() - t0

print(f"\n=== RESULT ===")
print(f"  success     : {result.success}")
print(f"  slots placed: {len(result.slots)}")
print(f"  elapsed     : {elapsed:.1f}s")
print(f"\nLast 20 log lines:")
for line in result.logs[-20:]:
    print(f"  {line}")

if result.slots:
    # Quick conflict check
    teacher_occ = collections.defaultdict(list)
    class_occ   = collections.defaultdict(list)
    for s in result.slots:
        key = (s.day, s.time_slot_id)
        teacher_occ[(s.teacher_id, key)].append(s.class_name)
        if s.batch_id is None:
            class_occ[(s.class_id, key)].append(s.subject_name)

    t_conflicts = {k: v for k, v in teacher_occ.items() if len(v) > 1}
    c_conflicts = {k: v for k, v in class_occ.items() if len(v) > 1}
    print(f"\n  Teacher conflicts : {len(t_conflicts)}")
    print(f"  Class conflicts   : {len(c_conflicts)}")
    if t_conflicts:
        for k, v in list(t_conflicts.items())[:3]:
            print(f"    Teacher {k[0]} on {k[1]}: {v}")
