import sqlite3

DB = r'backend/ghrce_v2.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Teacher 2 full picture
print('Teacher ID=2:')
c.execute('SELECT id, name, max_load, status FROM teachers WHERE id=2')
t = dict(c.fetchone())
print(f"  name={t['name']} max_load={t['max_load']} status={t['status']}")

# ALL subjects teacher 2 teaches
print('\nTeacher 2 subjects:')
c.execute('''SELECT s.name, s.type, s.weekly_load, s.semester
             FROM teacher_subjects ts JOIN subjects s ON ts.subject_id=s.id
             WHERE ts.teacher_id=2''')
total_load = 0
for s in c.fetchall():
    hrs = 2 if s['type'] == 'lab' else s['weekly_load']
    print(f"  {s['name']} ({s['type']}) sem={s['semester']} load={hrs}h")
    total_load += hrs
print(f"  -> Total load if ONE class: {total_load}h vs max_load={t['max_load']}h")

# Count batches across all classes that have the OOPS lab subject
print('\nClasses that use teacher 2 for OOPS lab (subj_id=5):')
c.execute('''SELECT cl.name, COUNT(b.id) as batch_count
             FROM classes cl
             JOIN batches b ON b.class_id=cl.id
             JOIN subjects s ON s.dept_id=cl.dept_id
             WHERE s.id=5
             GROUP BY cl.id''')
total_oops_hrs = 0
for r in c.fetchall():
    lab_hrs = r['batch_count'] * 2
    total_oops_hrs += lab_hrs
    print(f"  {r['name']} : {r['batch_count']} batches = {lab_hrs}h")
print(f"  TOTAL OOPS lab hours for teacher 2: {total_oops_hrs}h")
print(f"  Teacher 2 max_load: {t['max_load']}h")
if total_oops_hrs > t['max_load']:
    print(f"  ** OVERLOADED BY {total_oops_hrs - t['max_load']}h **")
else:
    print(f"  Load fits (has {t['max_load'] - total_oops_hrs}h left for other subjects)")

# Check: what is OOPS lab weekly_load?
print('\nOOPS lab subject details:')
c.execute("SELECT id, name, type, weekly_load, semester FROM subjects WHERE id=5")
s = dict(c.fetchone())
print(f"  {s}")

# Key: how many lab hours does teacher 2 need for ALL classes in dept?
print('\nFull requirement count for teacher 2 across ALL classes:')
c.execute('''SELECT s.name, s.type, COUNT(DISTINCT cl.id) as num_classes,
                    COUNT(DISTINCT b.id) as num_batches
             FROM teacher_subjects ts
             JOIN subjects s ON ts.subject_id=s.id
             JOIN classes cl ON cl.dept_id=s.dept_id
             LEFT JOIN batches b ON b.class_id=cl.id AND s.type='lab'
             WHERE ts.teacher_id=2
             GROUP BY s.id''')
grand_total = 0
for row in c.fetchall():
    if row['type'] == 'lab':
        req_hrs = row['num_batches'] * 2
    else:
        c.execute("SELECT weekly_load FROM subjects WHERE name=?", (row['name'],))
        wl = c.fetchone()['weekly_load']
        req_hrs = row['num_classes'] * wl
    grand_total += req_hrs
    print(f"  {row['name']} ({row['type']}): {row['num_classes']} classes, {row['num_batches']} batches -> {req_hrs}h needed")
print(f"\n  GRAND TOTAL required from teacher 2: {grand_total}h")
print(f"  Teacher 2 max_load: {t['max_load']}h")
if grand_total > t['max_load']:
    print(f"  *** STRUCTURALLY IMPOSSIBLE: overloaded by {grand_total - t['max_load']}h ***")

conn.close()
