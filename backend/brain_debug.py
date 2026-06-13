import sys, sqlite3, collections
sys.path.insert(0, 'backend')
from app.services.ai_engine import TimetableEngine

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

teacher_subj = collections.defaultdict(list)
for row in rows("SELECT teacher_id, subject_id FROM teacher_subjects"):
    teacher_subj[row['teacher_id']].append(row['subject_id'])

teachers = []
for t in teachers_raw:
    t['subject_ids'] = teacher_subj[t['id']]
    t['preferences'] = []
    teachers.append(t)

conn.close()

engine = TimetableEngine({"max_per_day": 6})
engine.DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Mocking the initialization logic from engine.generate
# to see initial domain sizes
requirements = []
t_subj_map = {t["id"]: set(t["subject_ids"]) for t in teachers}
teacher_map = {t["id"]: t for t in teachers}
room_map = {r["id"]: r for r in rooms}
class_map = {cl["id"]: cl for cl in classes}

# Load teaching assignments to build requirements
# (Mirroring backend/app/routers/timetable.py logic)
assignments = rows("SELECT * FROM teaching_assignments")
for a in assignments:
    # Theory
    hrs = a['theory_load']
    if hrs > 0:
        for _ in range(hrs):
            requirements.append({
                "class": class_map[a['class_id']],
                "subject": rows("SELECT * FROM subjects WHERE id=?", a['subject_id'])[0],
                "batch_id": None,
                "batch_name": None,
                "hrs": 1,
                "teacher_id": a['teacher_id']
            })
    # Lab
    if (a['lab_load'] or 0) > 0:
        # Assuming 2 hours per lab session
        n_sessions = (a['lab_load'] or 0) // 2
        for _ in range(n_sessions):
            requirements.append({
                "class": class_map[a['class_id']],
                "subject": rows("SELECT * FROM subjects WHERE id=?", a['subject_id'])[0],
                "batch_id": a['batch_id'],
                "batch_name": "Batch", # Simplified
                "hrs": 2,
                "teacher_id": a['teacher_id']
            })

print(f"Total requirements: {len(requirements)}")

# Local Mock setup for _compute_domain analysis
idx_to_slot = {s['slot_index']: s for s in slots}
n_slots = len(slots)
lunch_after_idx = engine.lunch_after_idx

def _straddles_lunch(si, hrs, lunch_after):
    return si <= lunch_after < (si + hrs - 1)

def _valid_starts(hrs):
    return [
        i for i in range(n_slots)
        if (i + hrs - 1) < n_slots
        and not _straddles_lunch(i, hrs, lunch_after_idx)
    ]

LAB_STARTS = _valid_starts(2)
THEORY_STARTS = _valid_starts(1)

# Mimic the engine's internal setup
teacher_load = collections.defaultdict(int)
class_subj_day = collections.defaultdict(list)
from app.services.ai_engine import ResourceIndex
ri = ResourceIndex(slots, rooms, teachers, classes)
teacher_unavail = collections.defaultdict(set)

print("\n--- Initial Domain Sizes ---")
bottlenecks = []
for i, req in enumerate(requirements):
    # Simplified _compute_domain
    subj = req["subject"]
    needed = req["hrs"]
    tid = req["teacher_id"]
    t = teacher_map[tid]
    
    cand_rooms = [r for r in rooms if r["type"].lower() == ("lab" if subj["type"] == "lab" else "classroom")]
    starts = LAB_STARTS if needed == 2 else THEORY_STARTS
    
    domain_size = 0
    for day in engine.DAYS:
        for si in starts:
            slots_needed = list(range(si, si + needed))
            if all(ri.is_teacher_free(day, idx_to_slot[s_idx]["id"], tid) for s_idx in slots_needed):
                 if any(all(ri.is_room_free(day, idx_to_slot[si2]["id"], r["id"]) for si2 in slots_needed) for r in cand_rooms):
                     domain_size += 1
    
    if domain_size <= 5:
        bottlenecks.append((i, req['subject']['name'], req['class']['name'], domain_size))

bottlenecks.sort(key=lambda x: x[3])
for b in bottlenecks:
    print(f"Req#{b[0]}: {b[1]} ({b[2]}) - Domain Size: {b[3]}")

if not bottlenecks:
    print("No immediate bottlenecks found in empty schedule.")
