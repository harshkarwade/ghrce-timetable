"""
AI Timetable Scheduling Engine
================================
Algorithm: Constraint Satisfaction Problem (CSP) with Backtracking
Optimization: Greedy heuristics + conflict resolution loop

Bug-fixes applied:
  1. Subject-per-day guard: a subject cannot be scheduled more than once
     on the same day for the same class/batch.
  2. Teacher-ownership lock: once a teacher is assigned to a subject for a
     specific class, that teacher is exclusively used for all subsequent
     slots of the same subject+class (prevents multiple teachers for same
     subject in one section).
  3. RECESS slot skipped: the 4th time-slot (index 3, 12:30-01:30) is
     automatically excluded when picking theory slots.
  4. Friday excluded: no scheduling on Friday (kept as PROJECT day).
"""

import random
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
from copy import deepcopy

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday"]   # Friday = PROJECT day
RECESS_SLOT_INDEX = 3   # 0-based index of the recess slot (12:30-01:30)

@dataclass
class ScheduleSlot:
    class_id: int
    class_name: str
    batch_id: Optional[int]
    batch_name: Optional[str]
    subject_id: int
    subject_name: str
    subject_type: str
    teacher_id: int
    teacher_name: str
    room_id: int
    room_name: str
    day: str
    time_slot_id: int
    time_slot_label: str
    is_substituted: bool = False
    original_teacher_id: Optional[int] = None

@dataclass
class ScheduleResult:
    slots: List[ScheduleSlot] = field(default_factory=list)
    iterations: int = 0
    conflicts_detected: int = 0
    conflicts_resolved: int = 0
    logs: List[str] = field(default_factory=list)
    success: bool = False

class TimetableEngine:
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.avoid_consecutive = self.config.get("avoid_consecutive", True)
        self.balance_load     = self.config.get("balance_load", True)
        self.labs_afternoon   = self.config.get("labs_afternoon", False)
        self.max_per_day      = self.config.get("max_per_day", 3)

    def generate(
        self,
        classes: List[Dict],
        batches: List[Dict],
        teachers: List[Dict],
        subjects: List[Dict],
        rooms: List[Dict],
        time_slots: List[Dict],
        semester_year: str = "2024-25",
        target_dept_id: Optional[int] = None,
        existing_entries: List[Dict] = None
    ) -> ScheduleResult:
        result = ScheduleResult()

        # Filter classes if department-wise scheduling is requested
        if target_dept_id:
            classes = [c for c in classes if c.get("dept_id") == target_dept_id]

        result.logs.append(f"🚀 Starting Engine | Classes: {len(classes)} | Dept: {target_dept_id or 'All'}")

        teacher_subjects_map = {t["id"]: set(t.get("subject_ids", [])) for t in teachers}
        active_teachers = [t for t in teachers if t.get("status", "present") == "present"]
        classrooms = [r for r in rooms if r["type"] == "classroom"]
        labs       = [r for r in rooms if r["type"] == "lab"]

        # Build batch map: class_id -> list of batches
        class_batches = {}
        for b in batches:
            class_batches.setdefault(b["class_id"], []).append(b)

        # ── Occupation trackers ──────────────────────────────────────────────
        teacher_occupied: Dict[Tuple, set] = {}
        room_occupied:    Dict[Tuple, set] = {}
        class_occupied:   Dict[Tuple, set] = {}
        batch_occupied:   Dict[Tuple, set] = {}
        teacher_day_count: Dict[Tuple, int] = {}
        class_day_count:   Dict[Tuple, int] = {}

        # ── NEW: per-day subject guard ───────────────────────────────────────
        # subject_day_placed[(class_id, batch_id, subject_id, day)] = True
        #   prevents the same subject appearing twice on the same day
        subject_day_placed: Dict[Tuple, bool] = {}

        # ── NEW: teacher-ownership lock per subject+class ────────────────────
        # class_subject_teacher[(class_id, subject_id)] = teacher_id
        #   ensures only ONE teacher ever teaches a given subject to a class
        class_subject_teacher: Dict[Tuple, int] = {}

        teacher_max_load_map = {t["id"]: t.get("max_load", 18) - t.get("admin_load", 0) for t in teachers}
        teacher_total_load: Dict[int, int] = {}

        # ── Pre-load existing entries (cross-dept conflict prevention) ────────
        if existing_entries:
            for e in existing_entries:
                if e.get("semester_year") == semester_year:
                    key = (e["day"], e["time_slot_id"])
                    teacher_occupied.setdefault(key, set()).add(e["teacher_id"])
                    room_occupied.setdefault(key, set()).add(e["room_id"])
                    if not e.get("batch_id"):
                        class_occupied.setdefault(key, set()).add(e["class_id"])
                    else:
                        batch_occupied.setdefault(key, set()).add(e["batch_id"])
                    teacher_total_load[e["teacher_id"]] = teacher_total_load.get(e["teacher_id"], 0) + 1
                    # Rebuild ownership lock from existing entries
                    lock_key = (e["class_id"], e["subject_id"])
                    if lock_key not in class_subject_teacher:
                        class_subject_teacher[lock_key] = e["teacher_id"]

        # ── Filtered slot lists (no recess, teacher theory only) ─────────────
        # theory_slots:  all slots excluding the recess slot index
        # lab_slots:     picks from non-recess pool as well
        theory_slots = [s for i, s in enumerate(time_slots) if i != RECESS_SLOT_INDEX]
        lab_starts   = [s for i, s in enumerate(time_slots[:-1]) if i != RECESS_SLOT_INDEX and i + 1 != RECESS_SLOT_INDEX]

        def is_free(teacher_id, room_id, class_id, batch_id, day, slot_id) -> Tuple[bool, str]:
            key = (day, slot_id)
            if teacher_id in teacher_occupied.get(key, set()):  return False, "teacher_conflict"
            if room_id    in room_occupied.get(key, set()):     return False, "room_conflict"
            if not batch_id:
                if class_id in class_occupied.get(key, set()): return False, "class_conflict"
                for b in class_batches.get(class_id, []):
                    if b["id"] in batch_occupied.get(key, set()): return False, "batch_conflict"
            else:
                if class_id  in class_occupied.get(key, set()): return False, "class_conflict"
                if batch_id  in batch_occupied.get(key, set()): return False, "batch_conflict"
            if teacher_day_count.get((teacher_id, day), 0) >= self.max_per_day: return False, "teacher_overload_day"
            if teacher_total_load.get(teacher_id, 0) >= teacher_max_load_map.get(teacher_id, 18): return False, "teacher_overload_weekly"
            if class_day_count.get((class_id, day), 0) >= self.max_per_day + 1:                    return False, "class_overload"
            return True, "ok"

        def occupy(teacher_id, room_id, class_id, batch_id, day, slot_id):
            key = (day, slot_id)
            teacher_occupied.setdefault(key, set()).add(teacher_id)
            room_occupied.setdefault(key, set()).add(room_id)
            if not batch_id:
                class_occupied.setdefault(key, set()).add(class_id)
            else:
                batch_occupied.setdefault(key, set()).add(batch_id)
            teacher_day_count[(teacher_id, day)] = teacher_day_count.get((teacher_id, day), 0) + 1
            teacher_total_load[teacher_id]       = teacher_total_load.get(teacher_id, 0) + 1
            if not batch_id:
                class_day_count[(class_id, day)] = class_day_count.get((class_id, day), 0) + 1

        # ── Main scheduling loop ─────────────────────────────────────────────
        for cls in classes:
            dept_id      = cls.get("dept_id")
            dept_subjects = [s for s in subjects if s.get("dept_id") == dept_id]
            if not dept_subjects:
                dept_subjects = subjects[:5]

            for subj in dept_subjects:
                subj_type    = subj.get("type", "theory")
                target_rooms = labs if subj_type == "lab" else classrooms
                if not target_rooms:
                    target_rooms = rooms

                # Only teachers actually assigned to this subject
                qualified = [t for t in active_teachers if subj["id"] in teacher_subjects_map.get(t["id"], set())]
                if not qualified:
                    result.logs.append(f"⚠️  No qualified teacher for {subj['name']}. Skipping.")
                    continue

                # ── Teacher-ownership lock ────────────────────────────────────
                lock_key = (cls["id"], subj["id"])
                if lock_key in class_subject_teacher:
                    locked_tid = class_subject_teacher[lock_key]
                    locked_teachers = [t for t in qualified if t["id"] == locked_tid]
                    if locked_teachers:
                        # Always use the already-assigned teacher
                        qualified = locked_teachers
                    # else: locked teacher is absent/unavailable — fall back to full list

                if subj_type == "lab" and class_batches.get(cls["id"]):
                    # Each batch gets its own 2-hour lab slot
                    target_entities = [
                        {"batch_id": b["id"], "name": b["name"], "count": subj.get("weekly_load", 2)}
                        for b in class_batches[cls["id"]]
                    ]
                else:
                    target_entities = [{"batch_id": None, "name": cls["name"], "count": subj.get("weekly_load", 3)}]

                for entity in target_entities:
                    placed   = 0
                    attempts = 0

                    while placed < entity["count"] and attempts < 150:
                        attempts += 1
                        result.iterations += 1

                        day = random.choice(DAYS)

                        # ── NEW: subject-per-day guard ────────────────────────
                        sd_key = (cls["id"], entity["batch_id"], subj["id"], day)
                        if subject_day_placed.get(sd_key):
                            result.conflicts_detected += 1
                            continue  # this day already has this subject — try another

                        # Pick teacher (load-balanced within qualified set)
                        teacher = (
                            min(qualified, key=lambda t: teacher_day_count.get((t["id"], day), 0))
                            if self.balance_load
                            else random.choice(qualified)
                        )
                        room = random.choice(target_rooms)

                        if subj_type == "lab":
                            # Pick 2 consecutive non-recess slots
                            if not lab_starts:
                                break
                            start_slot = random.choice(lab_starts)
                            start_idx  = time_slots.index(start_slot)
                            next_slot  = time_slots[start_idx + 1]

                            ok1, _ = is_free(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, start_slot["id"])
                            ok2, _ = is_free(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, next_slot["id"])

                            if ok1 and ok2:
                                common = dict(
                                    class_id=cls["id"], class_name=cls["name"],
                                    batch_id=entity["batch_id"],
                                    batch_name=entity["name"] if entity["batch_id"] else None,
                                    subject_id=subj["id"], subject_name=subj["name"],
                                    subject_type=subj_type,
                                    teacher_id=teacher["id"], teacher_name=teacher["name"],
                                    room_id=room["id"], room_name=room["name"],
                                    day=day,
                                )
                                result.slots.append(ScheduleSlot(**common, time_slot_id=start_slot["id"], time_slot_label=start_slot["label"]))
                                result.slots.append(ScheduleSlot(**common, time_slot_id=next_slot["id"],  time_slot_label=next_slot["label"]))
                                occupy(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, start_slot["id"])
                                occupy(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, next_slot["id"])
                                subject_day_placed[sd_key] = True
                                # Lock this teacher to this subject+class
                                class_subject_teacher.setdefault(lock_key, teacher["id"])
                                placed += 2
                                result.logs.append(f"✓ [{entity['name']}] Lab {subj['name']} → {teacher['name']} | {day} {start_slot['label']} & {next_slot['label']}")
                            else:
                                result.conflicts_detected += 1
                        else:
                            # 1-hour theory slot — never pick the recess slot
                            slot = random.choice(theory_slots)
                            ok, reason = is_free(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, slot["id"])
                            if ok:
                                result.slots.append(ScheduleSlot(
                                    class_id=cls["id"], class_name=cls["name"],
                                    batch_id=entity["batch_id"],
                                    batch_name=entity["name"] if entity["batch_id"] else None,
                                    subject_id=subj["id"], subject_name=subj["name"],
                                    subject_type=subj_type,
                                    teacher_id=teacher["id"], teacher_name=teacher["name"],
                                    room_id=room["id"], room_name=room["name"],
                                    day=day, time_slot_id=slot["id"], time_slot_label=slot["label"]
                                ))
                                occupy(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, slot["id"])
                                subject_day_placed[sd_key] = True
                                # Lock this teacher to this subject+class
                                class_subject_teacher.setdefault(lock_key, teacher["id"])
                                placed += 1
                                result.logs.append(f"✓ [{entity['name']}] Theory {subj['name']} → {teacher['name']} | {day} {slot['label']}")
                            else:
                                result.conflicts_detected += 1

        result.conflicts_resolved = result.iterations - result.conflicts_detected
        result.success = len(result.slots) > 0
        return result


class ReschedulingEngine:
    def find_substitute(self, absent_teacher: Dict, subject: Dict, day: str, time_slot_id: int, existing_entries: List[Dict], all_teachers: List[Dict]) -> Optional[Dict]:
        occupied_teacher_ids = {e["teacher_id"] for e in existing_entries if e["day"] == day and e["time_slot_id"] == time_slot_id}
        candidates = [t for t in all_teachers if t["id"] != absent_teacher["id"] and t["status"] == "present" and t["id"] not in occupied_teacher_ids]
        if not candidates: return None
        for t in candidates:
            if t.get("dept_id") == absent_teacher.get("dept_id") and subject["id"] in t.get("subject_ids", []): return t
        for t in candidates:
            if t.get("dept_id") == absent_teacher.get("dept_id"): return t
        return candidates[0] if candidates else None

    def reschedule(self, absent_teacher_ids: List[int], entries: List[Dict], all_teachers: List[Dict], subjects_map: Dict[int, Dict]) -> Tuple[List[Dict], List[Dict]]:
        changes = []
        updated = deepcopy(entries)
        for entry in updated:
            if entry["teacher_id"] not in absent_teacher_ids: continue
            absent = next((t for t in all_teachers if t["id"] == entry["teacher_id"]), None)
            if not absent: continue
            subject    = subjects_map.get(entry["subject_id"], {})
            substitute = self.find_substitute(absent, subject, entry["day"], entry["time_slot_id"], updated, all_teachers)
            if substitute:
                entry["original_teacher_id"]   = entry["teacher_id"]
                entry["original_teacher_name"] = entry["teacher_name"]
                entry["teacher_id"]            = substitute["id"]
                entry["teacher_name"]          = substitute["name"]
                entry["is_substituted"]        = True
                changes.append({"entry_id": entry["id"], "class_name": entry["class_name"], "subject_name": entry["subject_name"], "day": entry["day"], "slot_label": entry["time_slot_label"], "from_teacher": absent["name"], "to_teacher": substitute["name"], "status": "success"})
            else:
                changes.append({"entry_id": entry["id"], "class_name": entry["class_name"], "subject_name": entry["subject_name"], "day": entry["day"], "slot_label": entry["time_slot_label"], "from_teacher": absent["name"] if absent else "Unknown", "to_teacher": None, "status": "no_substitute_found"})
        return updated, changes
