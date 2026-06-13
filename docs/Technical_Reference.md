# GHRCE AI Timetable: Technical Reference

## Algorithm Architecture
The engine utilizes a **Hybrid Strategy** designed for high-density academic environments.

### Phase 1: Constraint Programming (CSP)
- **Engine**: Backtracking Search with **MRV (Minimum Remaining Values)** heuristic.
- **Forward Checking**: Every assignment is checked against look-ahead domains to prune the search space early.
- **Hard Constraints Enforcement**:
    - **Teacher Conflict**: A faculty identifier cannot exist in the same (Day, Slot) twice.
    - **Room Overlap**: A room identifier cannot be occupied by two different sessions simultaneously.
    - **Physical Limit**: 20 classrooms and 9 specific lab rooms (C02, C03, etc.).
    - **Batch Separation**: Batches B1, B2, B3 of the same Subject/Section cannot be scheduled in the same slot.
- **Dynamic Relaxation**: If the search exceeds 1 million iterations, the system relaxes the "Same-Subject-Same-Day-Theory" restriction to prevent deadlocks in highly saturated 40h sections.

### Phase 2: Genetic Algorithm (GA) Optimization
Once a 100% valid "skeleton" is found, the GA refines it over 30 generations.
- **Mutation (Validated Swap)**: Moves lectures to new slots only if no Hard Constraints are violated.
- **Soft Constraints (Fitness Scoring)**:
    - **Gap Penalty**: Minimizes gaps for students (Piecewise penalty for 2h and 3h gaps).
    - **Morning Core Priority**: Rewards placing core subjects in Slots 0 or 1.
    - **Fatigue Management**: Penalizes more than 3 consecutive teaching slots for any faculty.

## Data Models
- **TeachingAssignment**: Maps {Teacher, Subject, Class} to specific weekly loads.
- **TimeSlot**: 8 slots (60 mins each) from 09:30 AM – 06:30 PM.
- **Days**: 6 days (Mon–Sat) supported.

## Performance Tuning
- **Max Iterations**: 2,000,000 depth.
- **Max Hours per Day**: Capped at `config.max_per_day + 2` to prevent class exhaustion.
