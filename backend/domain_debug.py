"""
Deep diagnostic for domain-wipe on 'OOPS-Object Oriented Programming (PR)' batch=1
This script mimics _compute_domain with completely EMPTY occupation state
to find the STRUCTURAL root cause.
"""
import sqlite3, collections

DB = r'c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
LUNCH_AFTER_IDX = 2  # slots 0,1,2 are pre-lunch

print("=" * 70)
print("TARGET: OOPS-Object Oriented Programming (PR) | CSE-AIML-Sem5-B | batch=1")
print("=" * 70)

# 1. Find the subject
c.execute("SELECT * FROM subjects WHERE name LIKE '%OOPS%' AND type='lab'")
subjs = c.fetchall()
print("\n[1] Matching lab subjects:")
for s in subjs:
    print(f"  id={s['id']}  name={s['name']}  type={s['type']}  weekly_load={s['weekly_load']}")

if not subjs:
    print("  !! NO MATCHING SUBJECT FOUND")
    exit()

subj_id = subjs[0]['id']

# 2. Find the class
c.execute("SELECT * FROM classes WHERE name LIKE '%Sem5%B%'")
classes = c.fetchall()
print("\n[2] Matching classes:")
for cl in classes:
    print(f"  id={cl['id']}  name={cl['name']}  dept_id={cl['dept_id']}")

cls_id = classes[0]['id'] if classes else None

# 3. Find batches for this class
c.execute("SELECT * FROM batches WHERE class_id=?", (cls_id,))
batches = c.fetchall()
print(f"\n[3] Batches for class {cls_id}:")
for b in batches:
    print(f"  batch_id={b['id']}  name={b['name']}")

# 4. Find teachers qualified for this subject
c.execute("""
    SELECT t.id, t.name, t.max_load, t.status
    FROM teachers t
    JOIN teacher_subjects ts ON t.id = ts.teacher_id
    WHERE ts.subject_id = ?
""", (subj_id,))
qualified_teachers = c.fetchall()
print(f"\n[4] Teachers qualified for subject {subj_id}:")
if not qualified_teachers:
    print("  !! NO QUALIFIED TEACHERS AT ALL → DOMAIN WILL ALWAYS BE 0")
else:
    for t in qualified_teachers:
        print(f"  teacher_id={t['id']}  name={t['name']}  max_load={t['max_load']}  status={t['status']}")

# 5. Teacher preferences (unavailability)
c.execute("SELECT tp.*, t.name FROM teacher_preferences tp JOIN teachers t ON tp.teacher_id=t.id WHERE tp.is_preferred=0")
unavail = c.fetchall()
print(f"\n[5] Teacher UNAVAILABILITY entries (is_preferred=False):")
if not unavail:
    print("  (none)")
for u in unavail:
    print(f"  teacher={u['name']} day={u['day']} slot_id={u['preferred_slot_id']}")

# 6. Lab rooms
c.execute("SELECT * FROM rooms WHERE type='lab'")
lab_rooms = c.fetchall()
print(f"\n[6] Lab rooms available: {len(lab_rooms)}")
for r in lab_rooms:
    print(f"  id={r['id']}  name={r['name']}")

# 7. Time slots
c.execute("SELECT * FROM time_slots ORDER BY slot_index")
slots = c.fetchall()
print(f"\n[7] Time slots: {len(slots)}")
for s in slots:
    print(f"  slot_id={s['id']}  idx={s['slot_index']}  label={s['label']}")

n_slots = len(slots)
idx_to_slot = {s['slot_index']: s for s in slots}

# 8. Compute valid 2-hour starts (mimicking _valid_starts(2))
def valid_starts_2hr():
    starts = []
    for i in range(n_slots):
        end = i + 1  # needs i and i+1
        if end >= n_slots:
            continue
        # Cannot cross lunch (lunch is BETWEEN idx 2 and idx 3)
        if i <= LUNCH_AFTER_IDX < end:
            continue
        starts.append(i)
    return starts

lab_starts = valid_starts_2hr()
print(f"\n[8] Valid 2-hour lab start indices: {lab_starts}")
for si in lab_starts:
    ts1 = idx_to_slot[si]
    ts2 = idx_to_slot[si+1]
    print(f"  start={si}  → {ts1['label']} + {ts2['label']}")

# 9. Full domain analysis with EMPTY occupation state
print(f"\n[9] DOMAIN ANALYSIS (empty occupation state):")
print(f"    Testing teacher × room × day × start combinations...")

domain_count = 0
for t in qualified_teachers:
    if t['status'] != 'present':
        print(f"  SKIP teacher {t['name']}: status={t['status']}")
        continue
    if t['max_load'] < 2:
        print(f"  SKIP teacher {t['name']}: max_load={t['max_load']} < 2")
        continue

    # Check unavailability for this teacher
    unavail_set = set()
    for u in unavail:
        if u['teacher_id'] == t['id']:
            unavail_set.add((u['day'], u['preferred_slot_id']))

    teacher_blocked_count = 0
    for day in DAYS:
        for si in lab_starts:
            ts1 = idx_to_slot[si]
            ts2 = idx_to_slot[si+1]
            # Check teacher unavailability
            if (day, ts1['id']) in unavail_set or (day, ts2['id']) in unavail_set:
                teacher_blocked_count += 1
                continue
            # Try each lab room
            for r in lab_rooms:
                domain_count += 1
                # With empty state, all rooms are free

    remaining = len(DAYS) * len(lab_starts)
    print(f"  Teacher: {t['name']} (max_load={t['max_load']})")
    print(f"    Unavail blocks: {teacher_blocked_count} slot-pairs")
    print(f"    Available slot-pairs (teacher+day+start): {remaining - teacher_blocked_count}")
    print(f"    Lab rooms: {len(lab_rooms)}")
    print(f"    → TOTAL DOMAIN (teacher×room×day×start): {(remaining - teacher_blocked_count) * len(lab_rooms)}")

if domain_count == 0 and not qualified_teachers:
    print("\n  ROOT CAUSE: NO TEACHER IS QUALIFIED FOR THIS SUBJECT IN teacher_subjects TABLE")
elif domain_count == 0:
    print("\n  ROOT CAUSE: Teacher preferences block ALL available slots")
else:
    print(f"\n  With empty state, domain has {domain_count} options → NOT a data-only problem")
    print("  → Root cause is that during search, occupation state blocks all options")
    print("  → Check if batches 0,2 of OOPs lab consume all valid teacher slots")

# 10. How many total OOPS lab requirements exist across ALL classes?
c.execute("""
    SELECT cl.name as class_name, b.id as batch_id, b.name as batch_name,
           ts.teacher_id, t.name as teacher_name, t.max_load
    FROM teacher_subjects ts
    JOIN teachers t ON ts.teacher_id = t.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN classes cl ON cl.dept_id = s.dept_id
    LEFT JOIN batches b ON b.class_id = cl.id
    WHERE s.id = ?
""", (subj_id,))
all_oops_reqs = c.fetchall()
print(f"\n[10] All OOPS lab requirements across dept (class × batch × teacher):")
for row in all_oops_reqs:
    print(f"  {row['class_name']} batch={row['batch_name']} teacher={row['teacher_name']} max_load={row['max_load']}")

# 11. Critical: total hours OOPS lab teacher 2 must teach
c.execute("""
    SELECT s.name, s.type, s.weekly_load, ts.teacher_id, t.name as tname, t.max_load
    FROM teacher_subjects ts
    JOIN subjects s ON ts.subject_id = s.id
    JOIN teachers t ON ts.teacher_id = t.id
    WHERE ts.teacher_id = 2
""")
t2_subjects = c.fetchall()
print(f"\n[11] Teacher ID=2 subject assignments:")
total_required = 0
for row in t2_subjects:
    hrs = 2 if row['type'] == 'lab' else row['weekly_load']
    print(f"  {row['tname']}: {row['name']} ({row['type']}) → {hrs} hrs/week per class")
    total_required += hrs
print(f"    Single-class total hours: {total_required}")
print(f"    Teacher max_load: {t2_subjects[0]['max_load'] if t2_subjects else 'N/A'}")

conn.close()
print("\n" + "=" * 70)
print("DIAGNOSIS COMPLETE")
print("=" * 70)
