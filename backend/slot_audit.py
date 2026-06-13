import sqlite3

DB = r'backend/ghrce_v2.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute('SELECT id, label, slot_index FROM time_slots ORDER BY slot_index')
slots = c.fetchall()
print('Current time slots:')
for s in slots:
    print(f"  id={s['id']}  idx={s['slot_index']}  label={s['label']}")

c.execute("""SELECT COUNT(*) as cnt FROM timetable_entries te
             JOIN time_slots ts ON te.time_slot_id = ts.id
             WHERE ts.label LIKE '05:30%'""")
cnt = dict(c.fetchone())['cnt']
print(f'\nEntries using 05:30 PM slot: {cnt}')
conn.close()
