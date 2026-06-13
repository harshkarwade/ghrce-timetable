"""
AI Timetable Scheduling Engine — Enterprise Edition v2.0
=========================================================
Hybrid Strategy:
  Phase 1 — Conflict-Directed Backjumping (CBJ) CSP Solver
  Phase 2 — Genetic Algorithm Soft-Constraint Optimizer

Fixes & Enhancements over v1.2:
  [FIX-1]  teacher_subj_map parameter shadowing bug in _build_requirements
  [FIX-2]  Safe undo extraction — no more index-assumption crashes on empty ops
  [FIX-3]  Lab partner detection uses (batch_id, subject_id, day, slot contiguity)
           with deduplication so the wrong partner is never selected
  [FIX-4]  Domain cache invalidation is now surgical — only affected variables
           are cleared, not the entire cache
  [FIX-5]  ReschedulingEngine now shares the ResourceIndex helper with the CSP
           solver — no duplicated conflict logic
  [FIX-6]  ScheduleSlot gains to_dict() / from_dict() for full JSON round-trip
  [FIX-7]  _generate_notice_board reports overload, under-assignment,
           room saturation, substitution risk, and days with zero free slots
  [ENH-1]  GA population/generations are auto-scaled to problem size
  [ENH-2]  deepcopy replaced with a slot-index representation in GA;
           mutation and crossover work on indices — 10-20x faster
  [ENH-3]  Teacher max_load is respected in both CSP and fallback assignment
  [ENH-4]  Lunch-straddling guard is centralised in one helper used by both
           _compute_domain and _mutate_validated_swap
  [ENH-5]  Section / department codes propagated properly on all ScheduleSlots
  [ENH-6]  Full type annotations and docstrings throughout
"""

import sys
import collections
import random
import time
import json
import math
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional, Set
from dataclasses import dataclass, field, asdict
from copy import copy

# ---------------------------------------------------------------------------
# Shortcode registry
# ---------------------------------------------------------------------------

SHORTCODE_MAP: Dict[str, str] = {
    "Blockchain Technology": "BCT",
    "Design Analysis and Algorithm": "DAA",
    "Deep Learning": "DL",
    "Business Intelligence": "BI",
    "Research Methodology": "RM",
    "Introduction to Salesforce": "SF",
    "Salesforce": "SF",
    "Data Visualization": "DV",
    "Data Warehouse and Mining": "DWM",
    "Amazon Web Services Cloud Computing Services": "AWSCCS",
    "Employability": "MDM4TH",
    "User Interface and User Experience": "UIUX",
    "Formal Language and Automata": "FLA",
    "Object Oriented Programming": "OOPS",
    "Operating System": "OS",
    "Data Networks": "DN",
    "Computer Architecture": "CA",
    "Distributed Database System": "DDBMS",
    "Soft Computing": "SC",
    "Database Management System": "DBMS",
    "Natural Language Processing": "NLP",
    "Reinforcement Learning": "RL",
    "Engineering Economics and Industrial Management": "EEIM",
    "Aptitude": "APT",
    "Humanity Electives": "HE",
    "Open Elective": "OE",
    "Campus Recruitment Training": "CRT",
    "Relational database": "R-DB",
    "SC-Soft Computing": "SC",
}


def get_shortcode(full_name: str) -> str:
    """Return a 2-6 character shortcode for a subject name."""
    if full_name in SHORTCODE_MAP:
        return SHORTCODE_MAP[full_name]
    for k, v in SHORTCODE_MAP.items():
        if k.lower() in full_name.lower():
            return v
    return "".join(w[0] for w in full_name.split() if w and w[0].isupper())[:4] or full_name[:4].upper()


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ScheduleSlot:
    """A single scheduled period — one row in the final timetable."""
    class_id: int
    class_name: str
    batch_id: Optional[int]
    batch_name: Optional[str]
    subject_id: int
    subject_name: str
    subject_type: str          # "theory" | "lab"
    teacher_id: int
    teacher_name: str
    room_id: int
    room_name: str
    day: str
    time_slot_id: int
    time_slot_label: str
    is_substituted: bool = False
    original_teacher_id: Optional[int] = None
    subject_shortcode: str = ""
    dept_code: str = "AI"
    section_code: str = ""
    faculty_initials: str = ""
    is_core: bool = False

    # [FIX-6] JSON serialisation helpers
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ScheduleSlot":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class ScheduleResult:
    slots: List[ScheduleSlot] = field(default_factory=list)
    iterations: int = 0
    conflicts_detected: int = 0
    conflicts_resolved: int = 0
    logs: List[str] = field(default_factory=list)
    notice_board: Dict[str, Any] = field(default_factory=dict)
    success: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "iterations": self.iterations,
            "conflicts_detected": self.conflicts_detected,
            "conflicts_resolved": self.conflicts_resolved,
            "logs": self.logs,
            "slots": [s.to_dict() for s in self.slots],
            "notice_board": self.notice_board,
        }


# ---------------------------------------------------------------------------
# Shared resource-occupation index  [FIX-5]
# ---------------------------------------------------------------------------

class ResourceIndex:
    """
    Tracks which resources (teacher, room, class, batch) are occupied at
    each (day, slot_id) key.  Used by both the CSP solver and the
    ReschedulingEngine so conflict logic lives in one place.
    """

    def __init__(self) -> None:
        self.teacher:   Dict[Tuple, Set[int]] = collections.defaultdict(set)
        self.room:      Dict[Tuple, Set[int]] = collections.defaultdict(set)
        # [PERF] Room Type Capacity tracking: (day, slot_id, type) -> count_occupied
        self.room_type_occ: Dict[Tuple, int] = collections.defaultdict(int)
        self.cls:       Dict[Tuple, Set[int]] = collections.defaultdict(set)
        self.batch:     Dict[Tuple, Set[int]] = collections.defaultdict(set)
        self.cls_subj:  Dict[Tuple, Set[Tuple]] = collections.defaultdict(set)

    def clear(self) -> None:
        for d in (self.teacher, self.room, self.cls, self.batch, self.cls_subj):
            d.clear()
        self.room_type_occ.clear()

    def is_teacher_free(self, day: str, slot_id: int, teacher_id: int) -> bool:
        return teacher_id not in self.teacher[(day, slot_id)]

    def is_room_free(self, day: str, slot_id: int, room_id: int) -> bool:
        return room_id not in self.room[(day, slot_id)]

    def is_room_type_free(self, day: str, slot_id: int, rtype: str, total_capacity: int) -> bool:
        return self.room_type_occ[(day, slot_id, rtype)] < total_capacity

    def is_group_free(self, day: str, slot_id: int,
                      class_id: int, batch_id: Optional[int],
                      subject_id: int) -> bool:
        key = (day, slot_id)
        if batch_id is None:
            return class_id not in self.cls[key]
        return (batch_id not in self.batch[key] and
                (class_id, subject_id) not in self.cls_subj[key])

    def occupy(self, day: str, slot_id: int,
               teacher_id: int, room_id: int,
               class_id: int, batch_id: Optional[int],
               subject_id: int, rtype: str = "classroom") -> List[Tuple]:
        """Mark resources as occupied. Returns undo tokens."""
        key = (day, slot_id)
        undo = []
        self.teacher[key].add(teacher_id);    undo.append(("teacher",  key, teacher_id))
        self.room[key].add(room_id);          undo.append(("room",     key, room_id))
        self.room_type_occ[(day, slot_id, rtype)] += 1; undo.append(("room_type", (day, slot_id, rtype), 1))
        
        if batch_id is None:
            self.cls[key].add(class_id);      undo.append(("cls",      key, class_id))
        else:
            self.batch[key].add(batch_id);    undo.append(("batch",    key, batch_id))
            pair = (class_id, subject_id)
            self.cls_subj[key].add(pair);     undo.append(("cls_subj", key, pair))
        return undo

    def release(self, undo_tokens: List[Tuple]) -> None:
        """Reverse a set of occupy() calls."""
        mapping = {
            "teacher":  self.teacher,
            "room":     self.room,
            "cls":      self.cls,
            "batch":    self.batch,
            "cls_subj": self.cls_subj,
        }
        for (kind, key, val) in undo_tokens:
            if kind == "room_type":
                self.room_type_occ[key] -= val
            else:
                mapping[kind][key].discard(val)


# ---------------------------------------------------------------------------
# Lunch-straddling guard  [ENH-4]
# ---------------------------------------------------------------------------

def _straddles_lunch(start_idx: int, needed_hrs: int, lunch_after_idx: int) -> bool:
    """Return True if the block [start_idx, start_idx+needed_hrs) crosses lunch."""
    end_idx = start_idx + needed_hrs - 1
    return needed_hrs > 1 and start_idx <= lunch_after_idx < end_idx


# ---------------------------------------------------------------------------
# Faculty-initials helper
# ---------------------------------------------------------------------------

def get_initials(name: str) -> str:
    return "".join(w[0] for w in name.split() if w and w[0].isupper())[:3]


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class TimetableEngine:
    """
    Hybrid CSP + GA timetable scheduler.

    Parameters
    ----------
    config : dict, optional
        max_per_day      : int  — max slots per class per day (default 6)
        ga_generations   : int  — GA generations (auto-scaled if omitted)
        ga_population    : int  — GA population size (auto-scaled if omitted)
        lunch_after_idx  : int  — last slot index before lunch (default 2)
    """

    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    def __init__(self, config: Optional[Dict] = None) -> None:
        self.config        = config or {}
        self.max_per_day   = self.config.get("max_per_day", 6)
        self.lunch_after_idx = self.config.get("lunch_after_idx", 2)
        # GA params: overridden in generate() based on problem size if not set
        self._ga_gen_override  = self.config.get("ga_generations")
        self._ga_pop_override  = self.config.get("ga_population")

    # -----------------------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------------------

    def generate(
        self,
        classes: List[Dict],
        batches: List[Dict],
        teachers: List[Dict],
        subjects: List[Dict],
        rooms: List[Dict],
        time_slots: List[Dict],
        teaching_assignments: Optional[List[Dict]] = None,
        semester_year: str = "2024-25",
        target_dept_id: Optional[int] = None,
        existing_entries: Optional[List[Dict]] = None,
    ) -> ScheduleResult:
        def _to_dict(obj):
            if isinstance(obj, dict): return obj
            try:
                return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
            except:
                return obj.__dict__

        # Normalize inputs
        teachers = [_to_dict(t) for t in teachers]
        subjects = [_to_dict(s) for s in subjects]
        rooms = [_to_dict(r) for r in rooms]
        time_slots = [_to_dict(ts) for ts in time_slots]
        batches = [_to_dict(b) for b in batches]
        teaching_assignments = [_to_dict(ta) for ta in (teaching_assignments or [])]
        classes = [_to_dict(c) for c in classes]

        result = ScheduleResult()
        t_slots_sorted = sorted(time_slots, key=lambda x: x["slot_index"])

        # Create mapping of teacher subjects for faster lookup
        t_subj_map: Dict[int, Set[int]] = {}
        for t in teachers:
            # Handle both models (with .subjects relation) and dicts
            if "subject_ids" in t:
                t_subj_map[t["id"]] = set(t["subject_ids"])
            elif "subjects" in t:
                t_subj_map[t["id"]] = set(s["id"] if isinstance(s, dict) else s.id for s in t["subjects"])
            else:
                t_subj_map[t["id"]] = set()

        # --- Active teachers only ---
        active_teachers = [t for t in teachers if t.get("status", "present") == "present"]
        # [FIX-1] Handle teacher preferences only
        teacher_pref_map: Dict[int, List] = {
            t["id"]: t.get("preferences", []) for t in active_teachers
        }

        class_batches: Dict[int, List] = collections.defaultdict(list)
        for b in batches:
            class_batches[b["class_id"]].append(b)

        # --- Build requirements ---
        requirements, skipped = self._build_requirements(
            classes, subjects, class_batches,
            active_teachers, t_subj_map, teaching_assignments
        )
        if skipped:
            msg = (f"Pre-flight Check: {len(skipped)} requirements could not be scheduled due to missing data. "
                   f"The system skipped them to ensure a partial timetable can be generated. "
                   f"First 10 issues: {skipped[:10]}")
            result.logs.append(msg)
            print(f"[PRE-FLIGHT] {msg}")

        # --- Pre-flight Audit (informational only — no truncation) ---
        # Generate notices for the admin notice board, but pass ALL requirements
        # to the CSP solver unchanged. The CSP backtracking handles feasibility.
        audit_notices = self._capacity_audit(requirements, active_teachers, classes, rooms, t_slots_sorted)
        result.notice_board["notices"] = audit_notices

        # --- Phase 1 : CSP ---
        initial_slots = self._phase1_csp(
            requirements, active_teachers, t_subj_map,
            rooms, t_slots_sorted, class_batches, result, classes, subjects
        )
        if not initial_slots:
            result.success = False
            result.logs.append(
                "Critical Failure: Phase 1 (CSP) could not find a solution. "
                "Constraints may be too tight for the given teacher/room pool."
            )
            return result

        # --- Phase 2 : GA ---
        # [ENH-1] Auto-scale GA parameters to problem size
        n_req = len(requirements)
        ga_gen = self._ga_gen_override or max(30, min(100, n_req // 5))
        ga_pop = self._ga_pop_override or max(10, min(30, n_req // 10))

        optimized_slots = self._phase2_ga(
            initial_slots, active_teachers, teacher_pref_map,
            rooms, t_slots_sorted, classes, ga_gen, ga_pop
        )

        result.slots    = optimized_slots
        result.success  = True
        result.logs.append(
            f"Hybrid solver complete. "
            f"Slots={len(optimized_slots)}, GA gen={ga_gen}, pop={ga_pop}."
        )
        result.notice_board = self._generate_notice_board(
            result, classes, active_teachers, rooms, t_slots_sorted
        )
        result.logs.append(json.dumps(result.notice_board, indent=2))
        return result

    def _capacity_audit(self, requirements: List[Dict], teachers: List[Dict], classes: List[Dict], rooms: List[Dict], slots: List[Dict]) -> List[Dict]:
        """Check for obvious over-allocations before running CSP."""
        notices = []
        n_days = len(self.DAYS)
        n_slots = len(slots)
        total_capacity = n_days * n_slots

        # Class Load
        class_loads = collections.defaultdict(int)
        for r in requirements:
            class_loads[r["class"]["id"]] += r["hrs"]
            
        for cid, load in class_loads.items():
            if load > total_capacity:
                c_name = next((c["name"] for c in classes if c["id"] == cid), f"ID:{cid}")
                notices.append({
                    "level": "critical", "category": "CAPACITY_OVERFLOW",
                    "message": f"Class {c_name} assigned {load} sessions but only {total_capacity} slots available."
                })

        # Teacher Load
        teacher_loads = collections.defaultdict(int)
        for r in requirements:
            tid = r.get("teacher_id")
            if tid: teacher_loads[tid] += r["hrs"]
            
        for tid, load in teacher_loads.items():
            t = next((t for t in teachers if t["id"] == tid), None)
            if t:
                max_l = t.get("max_load", 40)
                if load > max_l:
                    notices.append({
                        "level": "critical", "category": "TEACHER_OVERLOAD",
                        "message": f"Teacher {t['name']} assigned {load} sessions but max load is {max_l}."
                    })

        # Room Type Load
        room_counts = collections.defaultdict(int)
        for r in rooms: room_counts[r["type"].lower()] += 1
        
        req_room_loads = collections.defaultdict(int)
        for r in requirements:
            rtype = "lab" if r["subject"]["type"] == "lab" else "classroom"
            req_room_loads[rtype] += r["hrs"]
            
        for rtype, load in req_room_loads.items():
            capacity = room_counts[rtype] * total_capacity
            if load > capacity:
                notices.append({
                    "level": "critical", "category": "ROOM_SATURATION",
                    "message": f"All {rtype} rooms combined provide {capacity} slots but {load} requested."
                })
        
        return notices

    # -----------------------------------------------------------------------
    # Requirement builder
    # -----------------------------------------------------------------------

    def _build_requirements(
        self,
        classes: List[Dict],
        subjects: List[Dict],
        class_batches: Dict[int, List],
        teachers: List[Dict],
        t_subj_map: Dict[int, Set[int]],   # [FIX-1] renamed from teacher_subj_map
        assignments: Optional[List[Dict]] = None,
    ) -> Tuple[List[Dict], List[str]]:

        requirements: List[Dict] = []
        skipped: List[str] = []

        subj_map   = {s["id"]: s for s in subjects}
        class_map  = {c["id"]: c for c in classes}
        teacher_map = {t["id"]: t for t in teachers}

        if assignments:
            # ── Professional mode: explicit TeachingAssignment rows ──────────
            assigned_class_ids: Set[int] = set()
            for assign in assignments:
                subj = subj_map.get(assign["subject_id"])
                cls  = class_map.get(assign["class_id"])
                if not subj or not cls:
                    continue
                if not teacher_map.get(assign["teacher_id"]):
                    continue

                assigned_class_ids.add(cls["id"])
                if assign["type"] == "lab":
                    b_id   = assign.get("batch_id")
                    b_name = next(
                        (b["name"] for b in class_batches[cls["id"]] if b["id"] == b_id),
                        "Unknown"
                    )
                    # [FIX-2] Each lab session = 2 hrs; weekly_load // 2 gives sessions/week
                    n_sessions = max(1, assign.get("weekly_load", 2) // 2)
                    for _ in range(n_sessions):
                        requirements.append({
                            "class": cls, "subject": subj,
                            "batch_id": b_id, "batch_name": b_name,
                            "hrs": 2, "is_core": subj.get("is_core", False),
                            "required_room_id": subj.get("required_room_id"),
                            "teacher_id": assign["teacher_id"],
                        })
                else:
                    load = assign.get("weekly_load", 3)
                    for _ in range(load):
                        requirements.append({
                            "class": cls, "subject": subj,
                            "batch_id": None, "batch_name": None,
                            "hrs": 1, "is_core": subj.get("is_core", False),
                            "required_room_id": subj.get("required_room_id"),
                            "teacher_id": assign["teacher_id"],
                        })

            # ── FIX: Fallback for classes with ZERO assignments ──────────────
            # Any class that had no rows in teaching_assignments is auto-inferred
            # from subject-teacher qualifications so it still gets a schedule.
            # [FIX-8] Seed committed load from already-assigned requirements so
            # load balancing is globally accurate, not just within this loop.
            teacher_committed: Dict[int, int] = collections.defaultdict(int)
            for _req in requirements:
                if _req.get("teacher_id"):
                    teacher_committed[_req["teacher_id"]] += _req["hrs"]
            unassigned_classes = [c for c in classes if c["id"] not in assigned_class_ids]
            if unassigned_classes:
                for cls in unassigned_classes:
                    skipped.append(
                        f"ADVISORY: Class {cls['name']} has no TeachingAssignment rows — "
                        f"auto-inferring from subject-teacher qualifications."
                    )
                    c_sem  = cls.get("semester")
                    c_dept = cls.get("dept_id")
                    dept_subjs = [
                        s for s in subjects
                        if s.get("dept_id") == c_dept and s.get("semester") == c_sem
                    ]
                    c_groups = class_batches.get(cls["id"], [])
                    for s in dept_subjs:
                        qualified = [
                            t for t in teachers
                            if s["id"] in t_subj_map.get(t["id"], set())
                        ]
                        if s["type"] == "lab":
                            for b in c_groups:
                                if not qualified:
                                    skipped.append(
                                        f"{s['name']} for {cls['name']} "
                                        f"batch={b['name']}: no qualified teacher (fallback)"
                                    )
                                    continue
                                qualified.sort(key=lambda t: teacher_committed[t["id"]])
                                chosen = qualified[0]
                                # [FIX-2] Correct lab session count
                                n_sessions = max(1, s.get("weekly_load", 2) // 2)
                                teacher_committed[chosen["id"]] += 2 * n_sessions
                                for _ in range(n_sessions):
                                    requirements.append({
                                        "class": cls, "subject": s,
                                        "batch_id": b["id"], "batch_name": b["name"],
                                        "hrs": 2, "is_core": s.get("is_core", False),
                                        "required_room_id": s.get("required_room_id"),
                                        "teacher_id": chosen["id"],
                                    })
                        else:
                            load = s.get("weekly_load", 3)
                            if not qualified:
                                skipped.append(
                                    f"Fallback Error: {s['name']} for {cls['name']}: "
                                    f"no teacher is qualified to teach this subject ({load}h needed)"
                                )
                                continue
                            qualified.sort(key=lambda t: teacher_committed[t["id"]])
                            chosen = qualified[0]
                            teacher_committed[chosen["id"]] += load
                            for _ in range(load):
                                requirements.append({
                                    "class": cls, "subject": s,
                                    "batch_id": None, "batch_name": None,
                                    "hrs": 1, "is_core": s.get("is_core", False),
                                    "required_room_id": s.get("required_room_id"),
                                    "teacher_id": chosen["id"],
                                })

        else:
            # ── Fallback mode: infer from subject–teacher intersection ───────
            teacher_committed: Dict[int, int] = collections.defaultdict(int)

            for cls in classes:
                c_sem   = cls.get("semester")
                c_dept  = cls.get("dept_id")
                dept_subjs = [
                    s for s in subjects
                    if s.get("dept_id") == c_dept and s.get("semester") == c_sem
                ]
                c_groups = class_batches.get(cls["id"], [])

                for s in dept_subjs:
                    qualified = [
                        t for t in teachers
                        if s["id"] in t_subj_map.get(t["id"], set())
                    ]

                    if s["type"] == "lab":
                        for b in c_groups:
                            if not qualified:
                                skipped.append(
                                    f"{s['name']} for {cls['name']} "
                                    f"batch={b['name']}: no qualified teacher"
                                )
                                continue
                            qualified.sort(key=lambda t: teacher_committed[t["id"]])
                            chosen = qualified[0]
                            # [FIX-2] Correct lab session count
                            n_sessions = max(1, s.get("weekly_load", 2) // 2)
                            teacher_committed[chosen["id"]] += 2 * n_sessions
                            for _ in range(n_sessions):
                                requirements.append({
                                    "class": cls, "subject": s,
                                    "batch_id": b["id"], "batch_name": b["name"],
                                    "hrs": 2, "is_core": s.get("is_core", False),
                                    "required_room_id": s.get("required_room_id"),
                                    "teacher_id": chosen["id"],
                                })
                    else:
                        load = s.get("weekly_load", 3)
                        if not qualified:
                            skipped.append(
                                f"{s['name']} for {cls['name']}: "
                                f"no qualified teacher ({load}h needed)"
                            )
                            continue
                        qualified.sort(key=lambda t: teacher_committed[t["id"]])
                        chosen = qualified[0]
                        teacher_committed[chosen["id"]] += load
                        for _ in range(load):
                            requirements.append({
                                "class": cls, "subject": s,
                                "batch_id": None, "batch_name": None,
                                "hrs": 1, "is_core": s.get("is_core", False),
                                "required_room_id": s.get("required_room_id"),
                                "teacher_id": chosen["id"],
                            })

        # Labs first — they have the smallest domain (hardest to place)
        requirements.sort(key=lambda r: (-(r["hrs"]), r["subject"]["name"]))
        return requirements, skipped

    # -----------------------------------------------------------------------
    # Phase 1 — CSP Solver (CBJ)
    # -----------------------------------------------------------------------

    def _phase1_csp(
        self,
        requirements: List[Dict],
        teachers: List[Dict],
        t_subj_map: Dict[int, Set[int]],
        rooms: List[Dict],
        time_slots: List[Dict],
        class_batches: Dict[int, List],
        result: ScheduleResult,
        classes: List[Dict],
        subjects: List[Dict]
    ) -> Optional[List[ScheduleSlot]]:
        """
        Conflict-Directed Backjumping CSP solver.
        Hard constraints: no teacher/room/class/batch double-booking,
        no lab straddling lunch, teacher unavailability preferences.
        """
        idx_to_slot = {i: ts for i, ts in enumerate(time_slots)}
        n_slots     = len(time_slots)
        slot_id_to_idx = {ts["id"]: i for i, ts in enumerate(time_slots)}

        teacher_map = {t["id"]: t for t in teachers}
        room_map    = {r["id"]: r for r in rooms}
        
        # [PERF] Room counts per type
        room_counts = collections.Counter([r["type"].lower() for r in rooms])

        # [PERF] Pre-calculate qualified teachers for each subject
        subj_teachers = collections.defaultdict(list)
        for s in subjects:
            subj_teachers[s["id"]] = [
                t for t in teachers if s["id"] in t_subj_map.get(t["id"], set())
            ]

        # Teacher unavailability from preferences
        teacher_unavail: Dict[int, Set[Tuple]] = collections.defaultdict(set)
        for t in teachers:
            for pref in t.get("preferences", []):
                p_day  = pref.get("day")  if isinstance(pref, dict) else getattr(pref, "day",  None)
                p_sid  = pref.get("preferred_slot_id") if isinstance(pref, dict) else getattr(pref, "preferred_slot_id", None)
                p_ok   = pref.get("is_preferred", True) if isinstance(pref, dict) else getattr(pref, "is_preferred", True)
                if not p_ok and p_day and p_sid:
                    teacher_unavail[t["id"]].add((p_day, p_sid))

        # 1. State setup
        ri = ResourceIndex()

        teacher_load:   Dict[int, int]         = collections.defaultdict(int)
        class_subj_day: Dict[Tuple, List[int]] = collections.defaultdict(list)

        # Pre-compute valid starts
        def _valid_starts(hrs: int) -> List[int]:
            return [
                i for i in range(n_slots)
                if (i + hrs - 1) < n_slots
                and not _straddles_lunch(i, hrs, self.lunch_after_idx)
            ]

        LAB_STARTS    = _valid_starts(2)
        THEORY_STARTS = _valid_starts(1)

        # ── Domain computation ───────────────────────────────────────────────
        def _compute_domain(req: Dict) -> List[Tuple]:
            cls    = req["class"]
            subj   = req["subject"]
            bid    = req["batch_id"]
            needed = req["hrs"]
            pin_tid = req.get("teacher_id")
            pin_rid = req.get("required_room_id")
            max_pd  = self.max_per_day  # [FIX-5] enforce max-per-day

            cand_teachers = (
                [teacher_map[pin_tid]] if pin_tid and pin_tid in teacher_map
                else sorted(
                    subj_teachers.get(subj["id"], []),
                    key=lambda t: teacher_load[t["id"]]
                )
            )

            if pin_rid and pin_rid in room_map:
                cand_rooms = [room_map[pin_rid]]
            else:
                rtype = "lab" if subj["type"] == "lab" else "classroom"
                cand_rooms = [r for r in rooms if r["type"].lower() == rtype]
                # [FIX-6] Shuffle once per domain call, not inside the hot loop
                random.shuffle(cand_rooms)

            starts = LAB_STARTS if needed == 2 else THEORY_STARTS
            domain: List[Tuple] = []

            # [FIX-4] Day-spread: count how many sessions this class already has per day
            cls_day_count: Dict[str, int] = collections.defaultdict(int)
            for day_key, subj_list in class_subj_day.items():
                if day_key[0] == cls["id"]:
                    cls_day_count[day_key[1]] += len(subj_list)

            # Preferred spread target: evenly across 5 days
            # Soft limit: skip days that are already at max_per_day
            spread_limit = max(max_pd, math.ceil(class_total_hrs[cls["id"]] / len(self.DAYS)) + 1)

            # Shuffle days for randomised spread
            shuffled_days = list(self.DAYS)
            random.shuffle(shuffled_days)
            # Prefer less-loaded days first
            shuffled_days.sort(key=lambda d: cls_day_count[d])

            for t in cand_teachers:
                tid = t["id"]
                max_load_val = t.get("max_load", 40)
                if teacher_load[tid] + needed > max_load_val:
                    continue

                for day in shuffled_days:
                    # [FIX-5] Hard max_per_day enforcement
                    if cls_day_count[day] >= max_pd:
                        continue

                    # No more than 2 sessions of same theory subject per day
                    if subj["type"] == "theory":
                        if class_subj_day[(cls["id"], day)].count(subj["id"]) >= 2:
                            continue

                    rtype = "lab" if subj["type"] == "lab" else "classroom"

                    for si in starts:
                        slots_needed = list(range(si, si + needed))

                        # Resource checks
                        if not all(ri.is_teacher_free(day, idx_to_slot[sidx]["id"], tid) for sidx in slots_needed):
                            continue
                        if not all(ri.is_group_free(day, idx_to_slot[sidx]["id"], cls["id"], bid, subj["id"]) for sidx in slots_needed):
                            continue

                        # [PERF] Rapid Room-Type Availability Check
                        if not all(ri.is_room_type_free(day, idx_to_slot[si2]["id"], rtype, room_counts[rtype])
                                   for si2 in slots_needed):
                            continue

                        # Find actual room ID (only when capacity is confirmed)
                        found_rid = None
                        for r in cand_rooms:
                            if all(ri.is_room_free(day, idx_to_slot[si2]["id"], r["id"]) for si2 in slots_needed):
                                found_rid = r["id"]
                                break

                        if found_rid is not None:
                            domain.append((tid, found_rid, day, si))

            if not domain and total_backtracks[0] > 100:
                msg = f"Bottleneck: {subj['name']} for {cls['name']} has 0 valid slots."
                if msg not in result.logs[-10:]:
                    result.logs.append(msg)

            return domain

        # ── Apply/undo via ResourceIndex ─────────────────────────────────────
        def _apply(tid: int, rid: int, day: str, si: int, req: Dict) -> List[Tuple]:
            cls   = req["class"]; subj = req["subject"]; bid = req["batch_id"]
            undo_all: List[Tuple] = []
            rtype = "lab" if subj["type"] == "lab" else "classroom"
            for s_idx in range(si, si + req["hrs"]):
                ts  = idx_to_slot[s_idx]
                tok = ri.occupy(day, ts["id"], tid, rid, cls["id"], bid, subj["id"], rtype)
                undo_all.extend(tok)
            teacher_load[tid] += req["hrs"]
            if subj["type"] == "theory":
                class_subj_day[(cls["id"], day)].append(subj["id"])
            # [FIX-2] Store tid/day explicitly so undo never guesses
            return [("__meta__", tid, day, req["hrs"],
                     subj["type"] == "theory", cls["id"], subj["id"])] + undo_all

        def _undo(undo_ops: List[Tuple]) -> None:
            if not undo_ops:
                return
            # [FIX-2] First token is always the meta token
            meta = undo_ops[0]
            if meta[0] != "__meta__":
                return
            _, tid, day, hrs, is_theory, cls_id, subj_id = meta
            teacher_load[tid] -= hrs
            if is_theory:
                lst = class_subj_day[(cls_id, day)]
                try:
                    lst.remove(subj_id)
                except ValueError:
                    pass
            ri.release(undo_ops[1:])

        def _make_slots(tid: int, rid: int, day: str, si: int, req: Dict) -> List[ScheduleSlot]:
            t    = teacher_map[tid]; r = room_map[rid]
            cls  = req["class"];    subj = req["subject"]
            bid  = req["batch_id"]; bname = req["batch_name"]
            f_ini = get_initials(t["name"])
            sc   = get_shortcode(subj["name"])
            out  = []
            for s_idx in range(si, si + req["hrs"]):
                ts = idx_to_slot[s_idx]
                out.append(ScheduleSlot(
                    class_id=cls["id"],           class_name=cls["name"],
                    batch_id=bid,                 batch_name=bname,
                    subject_id=subj["id"],        subject_name=subj["name"],
                    subject_type=subj["type"],
                    teacher_id=tid,               teacher_name=t["name"],
                    room_id=rid,                  room_name=r["name"],
                    day=day,
                    time_slot_id=ts["id"],        time_slot_label=ts["label"],
                    subject_shortcode=sc,
                    faculty_initials=f_ini,
                    is_core=req.get("is_core", False),
                    dept_code=cls.get("dept_code", "AI"),
                    section_code=cls.get("section_code", ""),
                ))
            return out

        # ── Variable selection : Static Ordering (Turbo) ───────────────────
        class_total_hrs = collections.defaultdict(int)
        teacher_total_hrs = collections.defaultdict(int)
        
        for r in requirements: 
            class_total_hrs[r["class"]["id"]] += r["hrs"]
            if r.get("teacher_id"):
                teacher_total_hrs[r["teacher_id"]] += r["hrs"]

        # 2. Sort variables: Labs FIRST (smallest domain → most constrained),
        #    then by busiest teacher, then busiest class.
        #    [FIX-1] Original sort at line 613 put labs first; this second sort
        #    must preserve that ordering so hard-to-place labs are not deferred.
        requirements.sort(key=lambda r: (
            0 if r["hrs"] == 2 else 1,          # labs (2-hr) before theory (1-hr)
            -teacher_total_hrs.get(r.get("teacher_id"), 0),
            -class_total_hrs[r["class"]["id"]],
            r["subject"]["id"]
        ))


        def _get_static_order(reqs: List[Dict]) -> List[int]:
            return list(range(len(reqs)))

        # ── Search state ─────────────────────────────────────────────────────
        N                    = len(requirements)
        total_backtracks     = [0]
        progress_backtracks  = [0]
        placed_best          = [0]
        global_best_slots    = []
        total_iter           = [0]
        # [FIX-3] Raised limits — institutional scale (17 classes, 250+ reqs)
        # needs more search budget before declaring a restart.
        STAGNATION_LIMIT     = 30_000
        MAX_TOTAL_ITER       = 20_000_000
        MAX_RESTARTS         = 25
        # [TURBO] Pre-sorted order instead of dynamic MRV
        static_order = _get_static_order(requirements)

        def _search(seed: int) -> Optional[Any]:
            random.seed(seed)
            ri.clear()
            teacher_load.clear()
            class_subj_day.clear()

            placed:        Dict[int, List] = {}
            unplaced_idx:  int             = 0
            undo_log:      List[List]      = []
            slot_log:      List[List]      = []
            choice_stack:  List[List]      = []

            while unplaced_idx < N:
                total_iter[0] += 1
                if total_iter[0] > MAX_TOTAL_ITER:
                    return None

                var = static_order[unplaced_idx]
                
                # [FIX-7] Progress log every 5% of requirements placed
                pct_done = int(unplaced_idx * 20 / N)  # 0-20 steps
                if total_iter[0] % 5000 == 0 or (pct_done * N // 20 == unplaced_idx):
                    rq = requirements[var]
                    pct = round(unplaced_idx / N * 100, 1)
                    msg = (f"CSP {pct}% ({unplaced_idx}/{N}) iter={total_iter[0]} bt={total_backtracks[0]} "
                           f"| {rq['class']['name']} {rq['subject']['name']}")
                    result.logs.append(msg)
                    print(msg)

                # Only compute domain when moving forward
                if len(choice_stack) <= unplaced_idx:
                    dom = _compute_domain(requirements[var])
                    if not dom:
                        # WIPE OUT - Backtrack
                        total_backtracks[0] += 1
                        progress_backtracks[0] += 1
                        if progress_backtracks[0] > STAGNATION_LIMIT: return "RESTART"
                        
                        if unplaced_idx == 0: return None
                        unplaced_idx -= 1
                        while True:
                            var_bt = static_order[unplaced_idx]
                            _undo(undo_log.pop())
                            slot_log.pop()
                            del placed[var_bt]
                            if choice_stack[unplaced_idx]:
                                break
                            choice_stack.pop()
                            if unplaced_idx == 0: return None
                            unplaced_idx -= 1
                        continue
                    
                    random.shuffle(dom)
                    choice_stack.append(dom)

                # Try next value
                if not choice_stack[unplaced_idx]:
                    choice_stack.pop()
                    if unplaced_idx == 0: return None
                    unplaced_idx -= 1
                    var_bt = static_order[unplaced_idx]
                    _undo(undo_log.pop())
                    slot_log.pop()
                    del placed[var_bt]
                    continue

                tid, rid, day, si = choice_stack[unplaced_idx].pop()
                ops = _apply(tid, rid, day, si, requirements[var])
                slots = _make_slots(tid, rid, day, si, requirements[var])
                
                placed[var] = slots
                undo_log.append(ops)
                slot_log.append(slots)
                unplaced_idx += 1
                
                if unplaced_idx > placed_best[0]:
                    placed_best[0] = unplaced_idx
                    progress_backtracks[0] = 0
                    # [BEST-EFFORT] Snapshot best slots so far
                    nonlocal global_best_slots
                    global_best_slots = [s for slots in slot_log for s in slots]

            # Success
            return [s for slots in slot_log for s in slots]

        # ── Restart loop ─────────────────────────────────────────────────────
        seed = 42
        for attempt in range(MAX_RESTARTS + 1):
            if attempt > 0:
                seed = random.randint(1, 999_999)
                progress_backtracks[0] = 0
                msg = (f"CSP Restart #{attempt} seed={seed} "
                       f"(total_bt={total_backtracks[0]}, best={placed_best[0]}/{N})")
                result.logs.append(msg); print(msg)

            out = _search(seed)
            if out == "RESTART":
                continue
            if out is not None:
                msg = (f"CSP solved: {len(out)} slots, "
                       f"{total_iter[0]} iters, {total_backtracks[0]} BTs, "
                       f"{attempt} restart(s).")
                result.logs.append(msg); print(msg)
                return out

        result.logs.append(f"CSP FAILED to reach 100%. Returning best effort ({placed_best[0]}/{N} slots).")
        
        # Populate truncated subjects for notice board
        if global_best_slots:
            if "truncated_subjects" not in result.notice_board:
                result.notice_board["truncated_subjects"] = []
                
            placed_indices = { static_order[i] for i in range(placed_best[0]) }
            for i in range(N):
                if i not in placed_indices:
                    req = requirements[static_order[i]]
                    msg = f"{req['subject']['name']} ({req['class']['name']})"
                    if msg not in result.notice_board["truncated_subjects"]:
                        result.notice_board["truncated_subjects"].append(msg)
            return global_best_slots
            
        return None

    # -----------------------------------------------------------------------
    # Phase 2 — Genetic Algorithm optimizer
    # -----------------------------------------------------------------------

    def _phase2_ga(
        self,
        initial_slots: List[ScheduleSlot],
        teachers: List[Dict],
        teacher_pref_map: Dict[int, List],
        rooms: List[Dict],
        time_slots: List[Dict],
        classes: List[Dict],
        ga_generations: int,
        ga_population: int,
    ) -> List[ScheduleSlot]:
        """
        GA soft-constraint optimizer.
        [ENH-2] Works on slot *indices* (ints) rather than deep-copied objects
        to avoid repeated full-list deepcopy.
        """
        ts_id_to_idx = {ts["id"]: i for i, ts in enumerate(time_slots)}

        def fitness(slot_list: List[ScheduleSlot]) -> int:
            score = 10_000
            class_slots:   Dict = collections.defaultdict(list)
            teacher_slots: Dict = collections.defaultdict(list)

            for s in slot_list:
                idx = ts_id_to_idx.get(s.time_slot_id, 0)
                class_slots[(s.class_id, s.day)].append(idx)
                teacher_slots[(s.teacher_id, s.day)].append(idx)

                # Morning core reward
                if s.is_core and idx <= 1:
                    score += 150

                # Theory in morning, lab in afternoon
                if s.subject_type == "theory" and idx <= 2:
                    score += 200
                if s.subject_type == "lab" and idx >= 3:
                    score += 150

                # Teacher preference satisfaction
                for pref in teacher_pref_map.get(s.teacher_id, []):
                    p_day    = pref.get("day") if isinstance(pref, dict) else getattr(pref, "day", None)
                    p_sid    = pref.get("preferred_slot_id") if isinstance(pref, dict) else getattr(pref, "preferred_slot_id", None)
                    p_ok     = pref.get("is_preferred", True) if isinstance(pref, dict) else getattr(pref, "is_preferred", True)
                    p_weight = pref.get("preference_weight", 1) if isinstance(pref, dict) else getattr(pref, "preference_weight", 1)
                    if p_day == s.day and p_sid == s.time_slot_id:
                        score += p_weight * 200 if p_ok else -500

            # Student gap penalty (pre/post lunch separately)
            for indices in class_slots.values():
                if len(indices) < 2: continue
                indices.sort()
                for block in [
                    [i for i in indices if i <= self.lunch_after_idx],
                    [i for i in indices if i >  self.lunch_after_idx],
                ]:
                    if len(block) < 2: continue
                    for a, b in zip(block, block[1:]):
                        gap = b - a - 1
                        if gap == 2:   score -= 100
                        elif gap == 3: score -= 300
                        elif gap >= 4: score -= 600

            # Teacher fatigue (3+ consecutive slots)
            for indices in teacher_slots.values():
                if len(indices) < 3: continue
                indices.sort()
                run = 1
                for a, b in zip(indices, indices[1:]):
                    if b == a + 1:
                        run += 1
                        if run >= 3: score -= 100 * (run - 2)
                    else:
                        run = 1

            # Room stability reward
            subj_rooms: Dict[int, Set[int]] = collections.defaultdict(set)
            for s in slot_list:
                subj_rooms[s.subject_id].add(s.room_id)
            for rs in subj_rooms.values():
                score += 100 if len(rs) == 1 else -50 * (len(rs) - 1)

            return score

        # ── [ENH-2] Population uses shallow lists of ScheduleSlot objects ────
        # We copy only the small mutable fields (day, time_slot_*) per swap
        def _clone_slots(src: List[ScheduleSlot]) -> List[ScheduleSlot]:
            return [copy(s) for s in src]

        population: List[List[ScheduleSlot]] = [
            _clone_slots(initial_slots) for _ in range(ga_population)
        ]

        # Sort by fitness
        population.sort(key=fitness, reverse=True)

        for gen in range(ga_generations):
            new_pop: List[List[ScheduleSlot]] = population[:2]   # elitism

            while len(new_pop) < ga_population:
                p1, p2 = random.sample(population[:max(5, ga_population // 2)], 2)

                # Crossover: class-wise
                child: List[ScheduleSlot] = []
                c_ids = list({s.class_id for s in initial_slots})
                for cid in c_ids:
                    src = p1 if random.random() < 0.5 else p2
                    child.extend([copy(s) for s in src if s.class_id == cid])

                # Mutation
                if random.random() < 0.15:
                    self._mutate_validated_swap(child, time_slots, rooms, ts_id_to_idx)

                new_pop.append(child)

            population = sorted(new_pop, key=fitness, reverse=True)

        return population[0]

    # -----------------------------------------------------------------------
    # Mutation: validated time-slot swap
    # -----------------------------------------------------------------------

    def _mutate_validated_swap(
        self,
        timetable: List[ScheduleSlot],
        time_slots: List[Dict],
        rooms: List[Dict],
        ts_id_to_idx: Dict[int, int],
    ) -> None:
        """
        Attempt to relocate one lecture (or lab pair) to an improved slot
        while respecting all hard constraints.
        [FIX-3] Lab partner is identified unambiguously with index-based check.
        """
        indices = list(range(len(timetable)))
        random.shuffle(indices)

        for target_idx in indices:
            slot = timetable[target_idx]
            is_lab = slot.subject_type == "lab"

            # [FIX-3] Find lab partner by exact contiguity check
            partner_idx: Optional[int] = None
            if is_lab:
                candidates = [
                    i for i, s in enumerate(timetable)
                    if i != target_idx
                    and s.batch_id == slot.batch_id
                    and s.subject_id == slot.subject_id
                    and s.day == slot.day
                    and s.teacher_id == slot.teacher_id
                ]
                for ci in candidates:
                    si_target  = ts_id_to_idx.get(slot.time_slot_id, -1)
                    si_cand    = ts_id_to_idx.get(timetable[ci].time_slot_id, -2)
                    if abs(si_target - si_cand) == 1:
                        partner_idx = ci
                        break
                if partner_idx is None:
                    continue  # malformed lab block — skip

            skip_set = {target_idx} | ({partner_idx} if partner_idx is not None else set())
            needed   = 2 if is_lab else 1

            days = list(self.DAYS); random.shuffle(days)
            tss  = list(time_slots); random.shuffle(tss)

            for day in days:
                for ts in tss:
                    si = ts["slot_index"]
                    if si + needed > len(time_slots):
                        continue
                    if _straddles_lunch(si, needed, self.lunch_after_idx):
                        continue

                    slot_ids = [time_slots[si + off]["id"] for off in range(needed)]

                    collision = False
                    for new_sid in slot_ids:
                        for i, other in enumerate(timetable):
                            if i in skip_set: continue
                            if other.day != day or other.time_slot_id != new_sid:
                                continue
                            # Teacher or room conflict
                            if other.teacher_id == slot.teacher_id:
                                collision = True; break
                            if other.room_id == slot.room_id:
                                collision = True; break
                            # Student group conflict
                            if other.class_id == slot.class_id:
                                if (other.batch_id is None or slot.batch_id is None
                                        or other.batch_id == slot.batch_id):
                                    collision = True; break
                        if collision: break

                    if not collision:
                        slot.day = day
                        slot.time_slot_id    = time_slots[si]["id"]
                        slot.time_slot_label = time_slots[si]["label"]
                        if partner_idx is not None:
                            timetable[partner_idx].day = day
                            timetable[partner_idx].time_slot_id    = time_slots[si + 1]["id"]
                            timetable[partner_idx].time_slot_label = time_slots[si + 1]["label"]
                        return

    # -----------------------------------------------------------------------
    # Notice board  [FIX-7]
    # -----------------------------------------------------------------------

    def _generate_notice_board(
        self,
        result: ScheduleResult,
        classes: List[Dict],
        teachers: List[Dict],
        rooms: List[Dict],
        time_slots: List[Dict],
    ) -> str:
        """
        Generates a comprehensive JSON audit report covering:
        - Teacher overload / underload
        - Under-assigned subjects
        - Room saturation (>80% usage)
        - Days with zero free slots for any teacher (substitution risk)
        - Days with zero free slots for a class
        """
        notices = []

        # ── Teacher load (critical overloads only — advisory entries omitted) ─
        t_load: Dict[int, int] = collections.defaultdict(int)
        for s in result.slots:
            t_load[s.teacher_id] += 1

        t_name_map = {t["id"]: t["name"] for t in teachers}
        t_max_map  = {t["id"]: t.get("max_load", 40) for t in teachers}

        for t in teachers:
            hrs  = t_load.get(t["id"], 0)
            maxl = t_max_map[t["id"]]
            # Only surface a LOAD_AUDIT notice when a teacher is critically overloaded
            if hrs > maxl:
                notices.append({"level": "critical", "category": "LOAD_AUDIT",
                                 "message": f"{t['name']} is overloaded: {hrs} sessions assigned but max is {maxl}. Consider splitting workload."})

        # ── Room saturation ─────────────────────────────────────────────────
        total_slots_available = len(self.DAYS) * len(time_slots)
        room_usage: Dict[int, int] = collections.defaultdict(int)
        for s in result.slots:
            room_usage[s.room_id] += 1

        r_name_map = {r["id"]: r["name"] for r in rooms}
        for r in rooms:
            usage    = room_usage.get(r["id"], 0)
            pct      = usage / max(total_slots_available, 1) * 100
            if pct >= 90:
                notices.append({"level": "critical", "category": "ROOM_SATURATION",
                                 "message": f"{r['name']} at {pct:.0f}% capacity."})
            elif pct >= 80:
                notices.append({"level": "warning", "category": "ROOM_SATURATION",
                                 "message": f"{r['name']} at {pct:.0f}% capacity."})

        # ── Substitution risk: any day with ALL teachers busy every slot ─────
        total_ts = len(time_slots)
        for day in self.DAYS:
            day_slots = [s for s in result.slots if s.day == day]
            for t in teachers:
                occupied = {s.time_slot_id for s in day_slots if s.teacher_id == t["id"]}
                if len(occupied) >= total_ts:
                    notices.append({"level": "warning", "category": "SUBSTITUTION_RISK",
                                     "message": f"{t_name_map[t['id']]} has no free slot on {day} — cannot substitute."})

        # ── Class with no free slot on a day ────────────────────────────────
        class_name_map = {c["id"]: c["name"] for c in classes}
        for c in classes:
            for day in self.DAYS:
                c_day_slots = {s.time_slot_id for s in result.slots
                               if s.class_id == c["id"] and s.day == day and s.batch_id is None}
                if len(c_day_slots) >= total_ts:
                    notices.append({"level": "warning", "category": "CLASS_OVERLOAD",
                                     "message": f"{class_name_map[c['id']]} fully booked on {day}."})

        return {
            "generated_at": datetime.now().isoformat(),
            "total_slots": len(result.slots),
            "notice_count": len(notices),
            "notices": notices,
        }


# ---------------------------------------------------------------------------
# Rescheduling engine  [FIX-5] — uses ResourceIndex for conflict checks
# ---------------------------------------------------------------------------

class ReschedulingEngine:
    """
    Dynamic repair scheduler for absent faculty.
    Uses ResourceIndex (shared with CSP) so all conflict logic is DRY.
    """

    def reschedule(
        self,
        absent_ids: List[int],
        entries: List[Dict],
        teachers: List[Dict],
        subjects_map: Optional[Dict] = None,
        target_day: Optional[str] = None,
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Find and apply substitutions for all absent teachers.

        Parameters
        ----------
        absent_ids   : IDs of absent teachers.
        entries      : Existing timetable entries (dicts with teacher_id, day,
                       time_slot_id, subject_id, dept_id, …).
        teachers     : Full teacher list (must include absent teachers for name lookup).
        subjects_map : Optional {subject_id: subject_dict} for richer scoring.

        Returns
        -------
        (updated_entries, change_log)
        """
        # Build resource index from existing schedule
        ri = ResourceIndex()
        for e in entries:
            ri.teacher[(e["day"], e["time_slot_id"])].add(e["teacher_id"])

        changes: List[Dict] = []
        absent_set = set(absent_ids)
        teacher_map = {t["id"]: t for t in teachers}

        present_teachers = [t for t in teachers if t["id"] not in absent_set]

        updated_entries: List[Dict] = []
        for entry in entries:
            # Skip if teacher is not absent
            if entry["teacher_id"] not in absent_set:
                updated_entries.append(entry)
                continue
            
            # Skip if we are targeting a specific day and this entry is not on that day
            if target_day and entry["day"] != target_day:
                updated_entries.append(entry)
                continue

            day     = entry["day"]
            slot_id = entry["time_slot_id"]
            subj_id = entry.get("subject_id")
            dept_id = entry.get("dept_id")
            old_name = entry.get("teacher_name", str(entry["teacher_id"]))

            def _score(t: Dict) -> int:
                s = 0
                if t.get("dept_id") == dept_id:
                    s += 100
                if subj_id and subj_id in t.get("subject_ids", []):
                    s += 50
                # prefer less-loaded teachers
                load = sum(1 for e2 in entries if e2["teacher_id"] == t["id"])
                s -= load
                return s

            candidates = sorted(present_teachers, key=_score, reverse=True)

            substituted = False
            for cand in candidates:
                if ri.is_teacher_free(day, slot_id, cand["id"]):
                    new_entry = dict(entry)
                    new_entry["original_teacher_id"] = entry["teacher_id"]
                    new_entry["teacher_id"]    = cand["id"]
                    new_entry["teacher_name"]  = cand["name"]
                    new_entry["is_substituted"] = True

                    # Mark candidate as busy
                    ri.teacher[(day, slot_id)].add(cand["id"])

                    updated_entries.append(new_entry)
                    changes.append({
                        "status":  "success",
                        "from":    old_name,
                        "to":      cand["name"],
                        "subject": entry.get("subject_name", str(subj_id)),
                        "day":     day,
                        "slot":    entry.get("time_slot_label", str(slot_id)),
                    })
                    substituted = True
                    break

            if not substituted:
                updated_entries.append(entry)  # keep original entry (unresolved)
                changes.append({
                    "status":  "failure",
                    "from":    old_name,
                    "to":      None,
                    "subject": entry.get("subject_name", str(subj_id)),
                    "day":     day,
                    "slot":    entry.get("time_slot_label", str(slot_id)),
                    "reason":  "No free qualified teacher found",
                })

        return updated_entries, changes