# 🎓 GHRCE AI Master Timetable System — Full Stack

**GH Raisoni College of Engineering**  
AI-powered timetable generator with real-time rescheduling, admin & teacher portals.

---

## 📁 Project Structure

```
ghrce-timetable/
├── backend/                  ← FastAPI + PostgreSQL
│   ├── main.py               ← App entry point
│   ├── requirements.txt
│   ├── seed.py               ← Seed database with sample data
│   ├── .env                  ← Database & JWT config
│   └── app/
│       ├── core/
│       │   ├── config.py     ← Settings
│       │   ├── database.py   ← SQLAlchemy engine
│       │   └── security.py   ← JWT + bcrypt
│       ├── models/
│       │   └── models.py     ← All DB tables
│       ├── schemas/
│       │   └── schemas.py    ← Pydantic models
│       ├── routers/
│       │   ├── auth.py       ← Login endpoint
│       │   ├── teachers.py   ← Teacher CRUD
│       │   ├── subjects.py   ← Subject CRUD
│       │   ├── rooms.py      ← Room CRUD
│       │   ├── timetable.py  ← Generate + Reschedule
│       │   ├── attendance.py ← Mark attendance
│       │   └── analytics.py  ← Charts data
│       └── services/
│           └── ai_engine.py  ← CSP + Backtracking algorithm
│
└── frontend/                 ← React.js + Tailwind CSS
    ├── package.json
    ├── .env                  ← API URL
    └── src/
        ├── App.js            ← Routes
        ├── services/api.js   ← All HTTP calls
        ├── store/authStore.js ← Zustand auth state
        └── pages/
            ├── LoginPage.js
            ├── admin/        ← Admin portal pages
            └── teacher/      ← Teacher portal pages
```

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React.js 18, Tailwind CSS, Recharts |
| Backend      | Python FastAPI                      |
| Database     | **PostgreSQL**                      |
| ORM          | SQLAlchemy 2.0                      |
| Auth         | JWT (python-jose) + bcrypt          |
| AI Engine    | CSP + Backtracking (custom Python)  |
| State Mgmt   | Zustand                             |
| HTTP Client  | Axios                               |

---

## 🚀 HOW TO RUN — Step by Step

### STEP 1 — Install PostgreSQL

**Option A: Local PostgreSQL**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows — download from: https://www.postgresql.org/download/windows/
```

**Option B: Free Cloud PostgreSQL (Recommended)**
- **Supabase** → https://supabase.com (free tier, no credit card)
- **Neon** → https://neon.tech (free tier)
- **Railway** → https://railway.app

---

### STEP 2 — Create Database

```bash
# Local PostgreSQL
psql -U postgres
CREATE DATABASE ghrce_timetable;
\q
```

For Supabase/Neon: copy the connection string from their dashboard.

---

### STEP 3 — Setup Backend

```bash
# Navigate to backend folder
cd ghrce-timetable/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate   

# Install dependencies
pip install -r requirements.txt

# Configure database URL
# Edit .env file and set your DATABASE_URL:
# LOCAL:   postgresql://postgres:password@localhost:5432/ghrce_timetable
# Supabase: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
# Neon:    postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

---

### STEP 4 — Seed Database

```bash
# Still inside backend/ with venv active
python seed.py
```

You should see:
```
✓ 4 departments
✓ 9 users
✓ 16 subjects
✓ 8 teachers
✓ 7 rooms/labs
✓ 5 classes
✓ 8 time slots
✅ Database seeded successfully!
```

---

### STEP 5 — Start Backend Server

```bash
uvicorn main:app --reload --port 8000
```

Backend running at: **http://localhost:8000**  
API Docs (Swagger): **http://localhost:8000/docs**

---

### STEP 6 — Setup Frontend

```bash
# Open new terminal, navigate to frontend
cd ghrce-timetable/frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend running at: **http://localhost:3000**

---

## 🔑 Login Credentials

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@ghrce.edu        | admin123    |

| Teacher | priya@ghrce.edu        | teacher123  |
| Teacher | rajesh@ghrce.edu       | teacher123  |
| Teacher | meena@ghrce.edu        | teacher123  |

---

## 📋 Using the System

### Generate Timetable (First Time)
1. Login as Admin → `admin@ghrce.edu / admin123`
2. Go to **Generate AI Timetable**
3. Configure constraints (or use defaults)
4. Click **⚡ Generate Optimized Timetable**
5. Wait for AI engine to complete (~2 seconds)
6. View results in **Master Timetable**, **Teacher Timetables**, **Room Timetables**

### Mark Attendance & Auto-Reschedule
1. Go to **Attendance & Reschedule**
2. Mark teachers as Present/Absent
3. If any are absent → click **🔄 Auto-Reschedule Timetable**
4. System finds substitutes and updates timetable instantly
5. View rescheduling log below

### Teacher Portal
1. Login as Teacher → `priya@ghrce.edu / teacher123`
2. View **My Dashboard** (today's schedule)
3. View **My Timetable** (full week grid)
4. Mark **My Attendance**
5. View **My Workload** (charts + subject list)

---

## 🤖 AI Engine

**Algorithm: Constraint Satisfaction Problem (CSP) with Backtracking**

Constraints enforced:
- ✅ No teacher double-booking
- ✅ No room double-booking  
- ✅ No class double-booking
- ✅ Max lectures per teacher per day
- ✅ Teacher subject qualification check
- ✅ Load balancing across teachers
- ✅ Lab afternoon scheduling (optional)

**Reschedule Algorithm:**
1. Detects absent teachers from attendance records
2. Scans timetable for their lectures
3. Finds substitute: same dept + same subject → same dept → any available
4. Checks substitute is not double-booked at that time
5. Updates timetable entries in DB
6. Logs all substitutions

---

## 🗄️ Database Schema

**Tables:** users, departments, teachers, teacher_subjects, subjects, rooms, classes, time_slots, timetable_entries, attendance, substitute_assignments

**Key relationships:**
- Teacher → Department (many-to-one)
- Teacher ↔ Subject (many-to-many via teacher_subjects)
- TimetableEntry → Class, Subject, Teacher, Room, TimeSlot
- Attendance → Teacher
- SubstituteAssignment → TimetableEntry, Teacher (x2)

---

## 🌐 API Endpoints

| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| POST   | /api/auth/login               | Login                 |
| GET    | /api/teachers/                | List teachers         |
| POST   | /api/teachers/                | Create teacher        |
| POST   | /api/timetable/generate       | AI generate timetable |
| GET    | /api/timetable/               | Get timetable entries |
| POST   | /api/timetable/reschedule     | Auto-reschedule       |
| POST   | /api/attendance/              | Mark attendance       |
| GET    | /api/analytics/workload       | Workload data         |
| GET    | /api/analytics/summary        | Dashboard summary     |

Full docs: http://localhost:8000/docs

---

## ☁️ Free Deployment

**Backend → Railway**
```bash
# Install Railway CLI
npm install -g railway
railway login
cd backend
railway init
railway up
```

**Frontend → Vercel**
```bash
npm install -g vercel
cd frontend
vercel
# Set REACT_APP_API_URL to your Railway backend URL
```

**Database → Supabase (free)**
1. Create project at supabase.com
2. Copy connection string to backend .env
3. Run: `python seed.py`

---

## 📞 Support

For issues, check:
1. Backend running: http://localhost:8000/health
2. DB connected: check `python seed.py` output
3. CORS: ensure frontend URL is in `allow_origins` in main.py
4. Token expired: logout and login again
