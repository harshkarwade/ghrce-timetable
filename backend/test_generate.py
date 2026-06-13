import requests
import json
import sys

BASE = "http://localhost:8000"

# ----- Login -----
login = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@ghrce.edu", "password": "admin123"})
print(f"Login: {login.status_code}")
if login.status_code != 200:
    print("LOGIN FAILED:", login.text)
    sys.exit(1)

token = login.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

# ----- Check DB state -----
classes_r = requests.get(f"{BASE}/api/timetable/classes", headers=headers)
slots_r   = requests.get(f"{BASE}/api/timetable/slots",   headers=headers)
classes   = classes_r.json() if classes_r.ok else []
slots_list = slots_r.json() if slots_r.ok else []
print(f"DB State  → Classes: {len(classes)}, TimeSlots: {len(slots_list)}")
for c in classes:
    print(f"  Class: {c['name']} (id={c['id']}, sem={c.get('semester')})")

# ----- Generate -----
print("\nGenerating timetable (may take 30-120s)...")
resp = requests.post(
    f"{BASE}/api/timetable/generate",
    headers=headers,
    json={
        "semester_year":     "2024-25",
        "avoid_consecutive": True,
        "balance_load":      True,
        "labs_afternoon":    False,
        "max_per_day":       3,
    },
    timeout=300,
)
print(f"HTTP Status : {resp.status_code}")
if resp.status_code != 200:
    print("ERROR:", resp.text)
    sys.exit(1)

result = resp.json()
print(f"Success          : {result.get('success')}")
print(f"Slots Generated  : {result.get('slots_generated')}")
print(f"Iterations       : {result.get('iterations')}")
print(f"Conflicts Det.   : {result.get('conflicts_detected')}")
print(f"Conflicts Res.   : {result.get('conflicts_resolved')}")

print("\n=== LOGS (last 25) ===")
for l in result.get("logs", [])[-25:]:
    print(" ", l[:200])

nb = result.get("notice_board", {})
print(f"\n=== NOTICE BOARD === (total_slots={nb.get('total_slots')}, notices={nb.get('notice_count')})")
for n in nb.get("notices", []):
    print(f"  [{n['level'].upper():8}] {n['category']}: {n['message']}")

ts = nb.get("truncated_subjects", [])
if ts:
    print(f"\nTruncated subjects ({len(ts)}):")
    for s in ts[:20]:
        print(" ", s)

# ----- Verify per-class coverage -----
print("\n=== PER-CLASS SLOT COUNTS ===")
all_entries = requests.get(f"{BASE}/api/timetable/", headers=headers, params={"semester_year": "2024-25"})
if all_entries.ok:
    from collections import defaultdict
    entries = all_entries.json()
    class_counts = defaultdict(int)
    for e in entries:
        class_counts[e["class_name"]] += 1
    for cls in sorted(class_counts.keys()):
        print(f"  {cls}: {class_counts[cls]} slots")
    missing = [c["name"] for c in classes if c["name"] not in class_counts]
    if missing:
        print(f"\n*** MISSING CLASSES (0 slots): {missing}")
    else:
        print(f"\n✅ All {len(classes)} classes have timetable entries!")
print("\nDone.")
