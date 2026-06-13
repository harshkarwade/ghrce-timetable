# GHRCE AI Timetable: User Manual (Academic Office)

Welcome to the GHRCE AI Timetable Management System. This manual explains how to generate, audit, and export institutional timetables using the professional AI engine.

## 1. Preparing the Input Data
The engine relies on a standardized Excel/CSV format named `Subject Distribution.csv`.

### CSV Columns Required:
| Column | Description |
| :--- | :--- |
| **Dept** | e.g., AI, CSE, ME. |
| **Year** | 1, 2, 3, or 4. |
| **Section** | A, B, C, or Combined codes (e.g., A+B). |
| **Subject** | Full name of the course. |
| **Theory** | Weekly load in hours (Theory). |
| **Practical** | Weekly load in hours (Lab). |
| **Professor** | Full name of the assigned faculty. |

> [!TIP]
> **Lab Batches**: For any row with `Practical > 0`, the engine automatically splits students into 3 batches (B1, B2, B3) as per GHRCE standard.

---

## 2. Running the Generation
Administrators can trigger the engine from the **Admin Dashboard**.

### The Hybrid Generation Process:
1.  **Phase 1 (CSP)**: The engine finds a conflict-free "skeleton" timetable (0 teacher, room, or student clashes).
2.  **Phase 2 (GA)**: The engine optimizes the schedule for "soft constraints" like reducing gaps for students and placing core subjects in morning slots.

---

## 3. Interpreting Results
After the engine completes, you will see a **Status Report**:
- **Success: True**: A 100% conflict-free solution was found.
- **Failures**: If "False", the engine will list the "Bottleneck Teachers" or sections (e.g., a teacher assigned 45 hours in a 40-slot week).

---

## 4. Exporting to PDF/Excel
Go to the **Reporting** tab to download the official GHRCE format:
- **Header**: Includes GH Raisoni College of Engineering branding.
- **Recess**: Includes the 12:30 PM - 01:30 PM lunch break.
- **8 Slots**: Renders slots from 09:30 AM to 06:30 PM.

---

## 5. Troubleshooting
> [!WARNING]
> **Data Deadlocks**: If sem1-A has 40 hours and a 5-day week is selected, the engine will fail. **Ensure Saturday is enabled** or reduce theory hours to reach 100%.
