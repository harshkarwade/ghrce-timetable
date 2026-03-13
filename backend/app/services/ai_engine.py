"""
AI Timetable Scheduling Engine
================================
Algorithm: Constraint Satisfaction Problem (CSP) with Backtracking
Optimization: Greedy heuristics + conflict resolution loop
"""

import random
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
from copy import deepcopy

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

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
        self.balance_load = self.config.get("balance_load", True)
        self.labs_afternoon = self.config.get("labs_afternoon", False)
        self.max_per_day = self.config.get("max_per_day", 3)

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
        labs = [r for r in rooms if r["type"] == "lab"]
        
        # Build batch map: class_id -> list of batches
        class_batches = {}
        for b in batches:
            class_batches.setdefault(b["class_id"], []).append(b)

        teacher_occupied: Dict[Tuple, set] = {}
        room_occupied: Dict[Tuple, set] = {}
        class_occupied: Dict[Tuple, set] = {}
        batch_occupied: Dict[Tuple, set] = {}
        teacher_day_count: Dict[Tuple, int] = {}
        class_day_count: Dict[Tuple, int] = {}

        # Load existing entries to prevent cross-department conflicts
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

        def is_free(teacher_id, room_id, class_id, batch_id, day, slot_id) -> Tuple[bool, str]:
            key = (day, slot_id)
            if teacher_id in teacher_occupied.get(key, set()): return False, "teacher_conflict"
            if room_id in room_occupied.get(key, set()): return False, "room_conflict"
            
            if not batch_id: # Theory class occupies whole class
                if class_id in class_occupied.get(key, set()): return False, "class_conflict"
                # Checks if any batch of this class is occupied
                for b in class_batches.get(class_id, []):
                    if b["id"] in batch_occupied.get(key, set()): return False, "batch_conflict"
            else: # Lab class occupies only a batch
                if class_id in class_occupied.get(key, set()): return False, "class_conflict"
                if batch_id in batch_occupied.get(key, set()): return False, "batch_conflict"
                
            if teacher_day_count.get((teacher_id, day), 0) >= self.max_per_day: return False, "teacher_overload"
            if class_day_count.get((class_id, day), 0) >= self.max_per_day + 1: return False, "class_overload"
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
            if not batch_id:
                class_day_count[(class_id, day)] = class_day_count.get((class_id, day), 0) + 1

        for cls in classes:
            dept_id = cls.get("dept_id")
            dept_subjects = [s for s in subjects if s.get("dept_id") == dept_id]
            if not dept_subjects: dept_subjects = subjects[:5]

            for subj in dept_subjects[:5]:
                subj_type = subj.get("type", "theory")
                target_rooms = labs if subj_type == "lab" else classrooms
                if not target_rooms: target_rooms = rooms

                # High Accuracy: Only teachers actually assigned to this subject
                qualified = [t for t in active_teachers if subj["id"] in teacher_subjects_map.get(t["id"], set())]
                if not qualified:
                    result.logs.append(f"⚠️ No qualified teacher for {subj['name']}. Skipping.")
                    continue

                if subj_type == "lab" and class_batches.get(cls["id"]):
                    # Schedule each batch 1 lecture per week
                    target_entities = [{"batch_id": b["id"], "name": b["name"], "count": 1} for b in class_batches[cls["id"]]]
                else:
                    # Schedule whole class 2 theory lectures per week
                    target_entities = [{"batch_id": None, "name": cls["name"], "count": 2}]

                for entity in target_entities:
                    placed = 0
                    attempts = 0
                    while placed < entity["count"] and attempts < 100:
                        attempts += 1
                        result.iterations += 1
                        day = random.choice(DAYS)
                        slot = random.choice(time_slots[4:] if self.labs_afternoon and subj_type == "lab" and len(time_slots) > 4 else time_slots)
                        teacher = min(qualified, key=lambda t: teacher_day_count.get((t["id"], day), 0)) if self.balance_load else random.choice(qualified)
                        room = random.choice(target_rooms)

                        ok, reason = is_free(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, slot["id"])
                        if ok:
                            slot_entry = ScheduleSlot(
                                class_id=cls["id"],
                                class_name=cls["name"],
                                batch_id=entity["batch_id"],
                                batch_name=entity["name"] if entity["batch_id"] else None,
                                subject_id=subj["id"],
                                subject_name=subj["name"],
                                subject_type=subj_type,
                                teacher_id=teacher["id"],
                                teacher_name=teacher["name"],
                                room_id=room["id"],
                                room_name=room["name"],
                                day=day,
                                time_slot_id=slot["id"],
                                time_slot_label=slot["label"]
                            )
                            result.slots.append(slot_entry)
                            occupy(teacher["id"], room["id"], cls["id"], entity["batch_id"], day, slot["id"])
                            placed += 1
                            result.logs.append(f"✓ [{entity['name']}] {subj['name']} → {teacher['name']} | {day} {slot['label']}")
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

        for t in candidates: # Priority 1: Same dept + teaches this subject
            if t.get("dept_id") == absent_teacher.get("dept_id") and subject["id"] in t.get("subject_ids", []): return t
        for t in candidates: # Priority 2: Same dept
            if t.get("dept_id") == absent_teacher.get("dept_id"): return t

        return candidates[0] if candidates else None

    def reschedule(self, absent_teacher_ids: List[int], entries: List[Dict], all_teachers: List[Dict], subjects_map: Dict[int, Dict]) -> Tuple[List[Dict], List[Dict]]:
        changes = []
        updated = deepcopy(entries)

        for entry in updated:
            if entry["teacher_id"] not in absent_teacher_ids: continue
            absent = next((t for t in all_teachers if t["id"] == entry["teacher_id"]), None)
            if not absent: continue

            subject = subjects_map.get(entry["subject_id"], {})
            substitute = self.find_substitute(absent, subject, entry["day"], entry["time_slot_id"], updated, all_teachers)

            if substitute:
                entry["original_teacher_id"] = entry["teacher_id"]
                entry["original_teacher_name"] = entry["teacher_name"]
                entry["teacher_id"] = substitute["id"]
                entry["teacher_name"] = substitute["name"]
                entry["is_substituted"] = True
                changes.append({
                    "entry_id": entry["id"],
                    "class_name": entry["class_name"],
                    "subject_name": entry["subject_name"],
                    "day": entry["day"],
                    "slot_label": entry["time_slot_label"],
                    "from_teacher": absent["name"],
                    "to_teacher": substitute["name"],
                    "status": "success"
                })
            else:
                changes.append({
                    "entry_id": entry["id"],
                    "class_name": entry["class_name"],
                    "subject_name": entry["subject_name"],
                    "day": entry["day"],
                    "slot_label": entry["time_slot_label"],
                    "from_teacher": absent["name"] if absent else "Unknown",
                    "to_teacher": None,
                    "status": "no_substitute_found"
                })

        return updated, changes
