# 🎓 GHRCE AI Master Timetable & College Management System

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![React](https://img.shields.io/badge/react-18-cyan.svg)

An enterprise-grade, AI-powered academic scheduling and management platform designed specifically for **G.H. Raisoni College of Engineering (GHRCE)**. This full-stack solution automates complex timetable generation, manages faculty workload, and facilitates real-time administrative workflows.

---

## ✨ Key Features

### 🤖 AI-Driven Scheduling
*   **Constraint Satisfaction Engine:** Uses CSP & Backtracking to generate conflict-free schedules based on teacher availability, room capacity, and subject requirements.
*   **Dynamic Rescheduling:** Instantly find substitutes for absent teachers while maintaining departmental workload balance.
*   **Load Balancing:** Automatically distributes teaching hours to prevent faculty burnout.

### 🏢 Multi-Role Portals
*   **Admin Dashboard:** Full control over departments, faculty, subjects, and rooms. Manage leave requests and bulk data operations.
*   **Teacher Portal:** Personal weekly schedule, daily workload analytics, attendance tracking, and leave request submission.

### 📊 Advanced Analytics
*   **Real-time Insights:** Visualized data for faculty workload distribution and room utilization.
*   **Attendance Trends:** Track teacher attendance patterns over time.

---

## 🏗️ Architecture & Tech Stack

### Backend (FastAPI)
*   **Framework:** FastAPI (Python) for high-performance asynchronous API endpoints.
*   **Database:** PostgreSQL with SQLAlchemy 2.0 ORM.
*   **Authentication:** JWT-based secure sessions with Bcrypt password hashing.
*   **Migrations:** Alembic for robust database version control.

### Frontend (React)
*   **UI/UX:** React 18 with Tailwind CSS for a modern, responsive interface.
*   **State Management:** Zustand for lightweight and efficient global state handling.
*   **Data Visualization:** Recharts for interactive administrative charts.
*   **Icons:** Lucide-React for consistent, high-quality iconography.

---

## 🚀 Quick Start Guide

### Prerequisites
*   Python 3.9+
*   Node.js 16+
*   PostgreSQL (Local or Cloud like Neon/Supabase)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your DATABASE_URL in .env
python seed.py        # Initialize database with sample GHRCE data
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## 🔐 Default Access (Seeded Data)

### Administrators
| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@ghrce.edu` | `admin123` |

### Faculty (Teachers)
| Department | Teacher | Email | Password |
| :--- | :--- | :--- | :--- |
| **CS** | Dr. Priya Sharma | `priya@ghrce.edu` | `teacher123` |
| **CS** | Prof. Rajesh Kumar | `rajesh@ghrce.edu` | `teacher123` |
| **CS** | Dr. Meena Joshi | `meena@ghrce.edu` | `teacher123` |
| **CS** | Prof. Amit Gupta | `amit@ghrce.edu` | `teacher123` |
| **ECE** | Dr. Anita Desai | `anita@ghrce.edu` | `teacher123` |
| **ECE** | Dr. Kavita Nair | `kavita@ghrce.edu` | `teacher123` |
| **ME** | Prof. Suresh Patel | `suresh@ghrce.edu` | `teacher123` |
| **CE** | Prof. Vikram Singh | `vikram@ghrce.edu` | `teacher123` |

---

## 🧠 How It Works: The AI & Workflow

This project isn't just a database; it has a **"Brain"** (the AI Engine) that solves the difficult puzzle of college scheduling. Here is how it works in simple terms:

### 1. The Problem: A Complex Puzzle 🧩
Imagine you have 50 teachers, 200 subjects, and only 10 classrooms.
*   No teacher can be in two rooms at once.
*   No room can hold two classes at once.
*   Teachers can only teach subjects they are qualified for.
*   Students shouldn't have 8 hours of lectures in a single day.

Doing this by hand takes weeks. Our AI does it in **2 seconds**.

### 2. The Algorithm: CSP + Backtracking 🤖
We use an approach called **Constraint Satisfaction Problem (CSP)** with **Backtracking**. 

*   **CSP (The Rules):** We tell the AI all the "Rules" (Constraints). For example: *"Teacher A is absent today"* or *"Room 101 is only for Labs"*.
*   **Backtracking (The Trial & Error):** The AI starts placing lectures into slots. If it hits a wall where it can't place a lecture without breaking a rule, it **"Backtracks"** (steps back), changes the previous choice, and tries again. 
*   **Heuristics (Smart Guessing):** Instead of guessing randomly, the AI uses "Greedy Heuristics" to pick the most difficult subjects first, making the puzzle easier to solve as it goes.

### 3. The Step-by-Step Workflow 🔄

1.  **Input:** The Admin enters data (Teachers, Subjects, Rooms) via the **React Frontend**.
2.  **Request:** The Frontend sends this data to the **FastAPI Backend**.
3.  **Processing:** The Backend calls the **AI Engine**.
4.  **Generation:** The Engine runs the CSP algorithm, checking millions of combinations instantly until it finds a "Perfect" conflict-free schedule.
5.  **Storage:** The result is saved in the **PostgreSQL Database**.
6.  **Real-time Update:** If a teacher marks themselves "Absent," the **Rescheduling Engine** kicks in. it looks at the current "state" of the world and finds the best available substitute in the same department who isn't already busy.

### 4. Why this matters? 🚀
By integrating AI directly into the workflow, the college moves from **Static Planning** (paper timetables that break when a teacher is sick) to **Dynamic Management** (a living system that heals itself when changes happen).

---

```bash
ghrce-timetable/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/            # Security & DB Config
│   │   ├── models/          # SQLAlchemy Entities
│   │   ├── routers/         # API Route Handlers
│   │   ├── schemas/         # Pydantic Pydantic Models
│   │   └── services/        # AI Engine logic
│   └── seed.py               # Database initialization
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/      # Shared UI Elements
│   │   ├── pages/           # Portal-specific Views
│   │   ├── services/        # API Integration
│   │   └── store/           # Zustand Stores
└── render.yaml               # Cloud Infrastructure Config
```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact & Support

For technical support or feature requests, contact the development team at `dev@ghrce.edu`.

---
*Created for the G.H. Raisoni College of Engineering Academic Excellence Program.*
