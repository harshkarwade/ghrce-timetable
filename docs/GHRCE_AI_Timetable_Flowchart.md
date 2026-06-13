# 🎓 GHRCE AI Timetable Scheduling Flowchart

This document provides a visual representation of the core AI scheduling algorithm used in the **GHRCE AI Timetable & College Management System**. The flowchart follows the technical logic outlined in the system documentation, styled after institutional process standards.

---

## 🤖 AI Scheduling Logic

The system utilizes a **Hybrid Strategy** combining deterministic **Constraint Programming (CSP)** for construction and **Genetic Algorithms (GA)** for optimization.

```mermaid
graph TD
    %% Styling Classes
    classDef startStop fill:#f96,stroke:#8b4513,stroke-width:2px,rx:20,ry:20,color:#000,font-weight:bold;
    classDef io fill:#f96,stroke:#8b4513,stroke-width:2px,color:#000;
    classDef process fill:#fbb034,stroke:#8b4513,stroke-width:2px,color:#000;
    classDef decision fill:#f96,stroke:#8b4513,stroke-width:2px,color:#000;
    classDef hybrid fill:#fff4dd,stroke:#d35400,stroke-width:2px,color:#000;

    %% Nodes
    S((Start)):::startStop
    R[/Read Data: Teachers, CSV Distribution,<br/>Rooms & slots/]:::io
    
    subgraph CSP ["Phase 1: Constraint Programming (Construction)"]
        B[Build Physical Skeleton &<br/>Propagate Constraints]:::process
        C{All Req's<br/>Satisfied?}:::decision
        P[Backtracking: Select<br/>Next Variable/Value]:::process
        M{Collision Detected?}:::decision
        A[Assign Slot &<br/>Update Loads]:::process
    end

    subgraph GA ["Phase 2: Genetic Algorithm (Optimization)"]
        G[Initialize Population from<br/>CSP Skeleton]:::process
        F[Evaluate Fitness:<br/>Gaps, Core Subjects, Prefs]:::process
        Mut[Mutation: Validated Swaps]:::process
        Conv{Stability Reached?}:::decision
    end

    V[/Export Official GHRCE PDF/Excel/]:::io
    E((Stop)):::startStop

    %% Flow Details
    S --> R
    R --> B
    B --> C
    C -- "No" --> P
    P --> M
    M -- "No" --> A
    A --> C
    M -- "Yes" --> P
    
    C -- "Yes" --> G
    G --> F
    F --> Mut
    Mut --> Conv
    Conv -- "No" --> F
    Conv -- "Yes" --> V
    V --> E

    %% Styling Connections
    linkStyle default stroke:#8b4513,stroke-width:2px;
```

### 🔍 Constraint Checklist
During the **"Constraints Satisfied?"** decision node, the system validates the following:
1.  **Teacher Collision**: Is the faculty member already booked?
2.  **Room Occupancy**: Is the room available for this slot?
3.  **Class Overlap**: Are the students already in another lecture?
4.  **Subject-per-Day**: Does this subject already appear today?
5.  **Recess Guard**: Is this a protected break period?
6.  **Weekly Load**: Does the assignment exceed the teacher's maximum hours?

---
*GHRCE AI Timetable System - Logic Visualization*
