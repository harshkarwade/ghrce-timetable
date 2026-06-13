# 🎓 GHRCE AI Master Timetable System: Unified Project Prompts

This document serves as the master technical specification and logical foundation for the GHRCE AI Timetable system. It consolidates all core constraints, architectural prompts, and algorithmic logic used across the project.

---

## 🤖 1. AI Scheduling Engine (Hybrid CSP + GA)

### Phase 1: Constraint Satisfaction Problem (CSP)
**Objective**: Generate a 100% conflict-free skeletal schedule.
-   **Strategy**: Deterministic Backtracking Search with MRV (Minimum Remaining Values) heuristic.
-   **Hard Constraints**:
    -   **Teacher Collision**: Faculty cannot be in two places at once.
    -   **Room Saturation**: Rooms cannot be double-booked; respect physical capacity (20 Classrooms, 9 Labs).
    -   **Student Conflict**: A Class/Section cannot have overlapping lectures.
    -   **Lab Batch Logic**: Batches (B1, B2, B3) of the same Subject/Class must be scheduled in different slots.
    -   **Lunch Protection**: No lab session (2h) can straddle the lunch break (Slot 3).
-   **Dynamic Relaxation**: At >1,000,000 iterations, fallback to allow same-subject theory sessions on the same day to ensure feasibility in saturated environments.

### Phase 2: Genetic Algorithm (GA) Optimization
**Objective**: Refine the skeletal schedule for pedagogical quality.
-   **Strategy**: Evolutionary optimization over 30+ generations.
-   **Fitness Scoring (Soft Constraints)**:
    -   **Gap Minimization**: Penalize student idle time (Piecewise penalty for 2h/3h gaps).
    -   **Core Subject Priority**: Reward placing "Core" subjects in early morning slots (0 & 1).
    -   **Faculty Preference**: Honor "Preferred" vs "Unpreferred" slot settings from teacher profiles.
    -   **Fatigue Management**: Avoid more than 3 consecutive teaching slots for any teacher.
-   **Mutation**: Perform "Validated Swaps" that improve fitness without violating Phase 1 hard constraints.

---

## 🎨 2. Frontend Design & UX (Premium Aesthetics)

### Visual Design Principles
-   **Aesthetics**: Ultra-modern "Glassmorphism" interface with a deep charcoal/navy palette.
-   **Styling**: Vanilla CSS for layout precision; Tailwind CSS for utility-first responsiveness.
-   **Typography**: Clean sans-serif hierarchy (Inter/Roboto) with monospaced accents for technical data.
-   **Interactivity**: 
    -   Subtle hover scale effects (1.02x).
    -   Smooth transitions (300ms) for all state changes.
    -   Pulse animations for real-time status indicators (e.g., absent teachers).
-   **Data Visualization**: Custom CSS grids for the 8x6 timetable matrix, using vibrant gradients to distinguish between Theory (Teal) and Lab (Amber) sessions.

---

## 🛡️ 3. Backend Architecture & Security

### Framework & Structure
-   **Core**: FastAPI (Python 3.10+) for high-performance asynchronous execution.
-   **ORM**: SQLAlchemy 2.0 with PostgreSQL for robust data persistence.
-   **Security**:
    -   **Auth**: Stateless JWT-based authentication.
    -   **Hashing**: Bcrypt (rounds=12) for all user passwords.
    -   **RBAC**: Role-Based Access Control (`admin`, `teacher`, `user`) enforced via FastAPI dependencies.

### Analytics Logic
-   **Workload Audit**: Calculate `active_lectures / max_load` for each teacher.
-   **Utilization Index**: Track `occupied_slots / total_capacity` for rooms.
-   **Substitution Risk**: Flag teachers with < 2 free slots per day.

---

## 📊 4. Data Ingestion & Parsing (Excel Logic)

### Excel Parser Heuristics
-   **Fuzzy Matching**: Identify subject names and teacher names across varying column headers (e.g., "Professor" vs "Name of Faculty").
-   **Load Inference**:
    -   **Theory**: Weekly load // 1 = number of 1h sessions.
    -   **Lab**: Weekly load // 2 = number of 2h sessions.
-   **Virtual Batching**: Automatically create batches (B1, B2, B3) for labs if not explicitly defined in the source file.
-   **Deduplication**: Aggressively merge overlapping requirements from master institution files.

---

## 📅 5. Rescheduling & Substitution Logic

### The "Sub-Engine" Prompt
-   **Trigger**: Teacher marks "Absent" or admin initiates a manual reschedule.
-   **Eligibility Ranking**:
    1.  **Availability**: Must be free in the target slot.
    2.  **Competency**: Must be qualified to teach the specific subject.
    3.  **Department**: Prefer teachers from the same department.
    4.  **Load Balance**: Prefer teachers with the lowest current weekly load.
-   **Audit Trail**: Every substitution must be logged in the `substitute_assignments` table with an `original_teacher_id` reference.

---
*GHRCE AI Timetable System - Logic Manifest v3.1*
