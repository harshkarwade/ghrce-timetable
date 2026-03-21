import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only redirect on 401 (token invalid/expired), not on 404 or 422
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect from /login itself
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("teacherId");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  API.post("/auth/login", { email, password });

export const getMe = () => API.get("/auth/me");

// ── Teachers ──────────────────────────────────────────────────────────────────
export const getTeachers = () => API.get("/teachers/");
export const createTeacher = (data) => API.post("/teachers/", data);
export const updateTeacher = (id, data) => API.patch(`/teachers/${id}`, data);
export const deleteTeacher = (id) => API.delete(`/teachers/${id}`);
export const updateTeacherStatus = (id, status) =>
  API.patch(`/teachers/${id}/status?status=${status}`);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const getSubjects = () => API.get("/subjects/");
export const createSubject = (data) => API.post("/subjects/", data);
export const getDepartments = () => API.get("/subjects/departments");

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const getRooms = () => API.get("/rooms/");
export const createRoom = (data) => API.post("/rooms/", data);

// ── Timetable ─────────────────────────────────────────────────────────────────
export const generateTimetable = (config) =>
  API.post("/timetable/generate", config);

// No semester_year filter by default so all entries are returned
export const getTimetable = (params = {}) =>
  API.get("/timetable/", { params });

export const getClasses = () => API.get("/timetable/classes");
export const getTimetableStatus = () => API.get("/timetable/status");
export const getTimeSlots = () => API.get("/timetable/slots");

// Classes
export const createClass = (data) => API.post("/classes/", data);
export const updateClass = (id, data) => API.put(`/classes/${id}`, data);
export const deleteClass = (id) => API.delete(`/classes/${id}`);
export const createTimetableEntry = (data) => API.post("/timetable/", data);
export const updateTimetableEntry = (id, data) => API.put(`/timetable/${id}`, data);

export const reschedule = (date) =>
  API.post("/timetable/reschedule", { date });

// ── Attendance ────────────────────────────────────────────────────────────────
export const markAttendance = (teacher_id, date, status) =>
  API.post("/attendance/", { teacher_id, date, status });

export const getTodayAttendance = () => API.get("/attendance/today");
export const getTeacherAttendance = (id) =>
  API.get(`/attendance/teacher/${id}`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getWorkload = () => API.get("/analytics/workload");
export const getRoomUtilization = () => API.get("/analytics/room-utilization");
export const getSubjectDistribution = () =>
  API.get("/analytics/subject-distribution");
export const getSummary = () => API.get("/analytics/summary");
export const getAttendanceTrends = () => API.get("/analytics/attendance-trends");

// ── Leaves (admin) ────────────────────────────────────────────────────────────
export const getLeaveRequests = (params = {}) => API.get("/leaves/", { params });
export const updateLeaveStatus = (id, status) =>
  API.put(`/leaves/${id}`, { status });

export default API;
