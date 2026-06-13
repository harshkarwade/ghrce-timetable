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
export const getCandidates = (day, slot_id, subject_id) => API.get(`/timetable/candidates`, { params: { day, time_slot_id: slot_id, subject_id } });
export const applySubstitution = (entry_id, substitute_id) => API.post(`/timetable/substitute`, null, { params: { entry_id, substitute_id } });
export const getAffectedEntries = () => API.get(`/timetable/affected`);
export const rebalanceWorkload = () => API.post(`/teachers/rebalance`);
export const getTeachers = () => API.get("/teachers/");
export const createTeacher = (data) => API.post("/teachers/", data);
export const updateTeacher = (id, data) => API.patch(`/teachers/${id}`, data);
export const deleteTeacher = (id) => API.delete(`/teachers/${id}`);
export const updateTeacherStatus = (id, status) =>
  API.patch(`/teachers/${id}/status?status=${status}`);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const getSubjects = () => API.get("/subjects/");
export const createSubject = (data) => API.post("/subjects/", data);
export const updateSubject = (id, data) => API.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => API.delete(`/subjects/${id}`);
export const getDepartments = () => API.get("/subjects/departments");

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const getRooms = () => API.get("/rooms/");
export const createRoom = (data) => API.post("/rooms/", data);
export const updateRoom = (id, data) => API.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => API.delete(`/rooms/${id}`);

// ── Timetable ─────────────────────────────────────────────────────────────────
export const generateTimetable = (config) =>
  API.post("/timetable/generate", config);

// No semester_year filter by default so all entries are returned
export const getTimetable = (params = {}) =>
  API.get("/timetable/", { params });

export const getClasses = () => API.get("/timetable/classes");
export const getTimetableStatus = () => API.get("/timetable/status");
export const getTimeSlots = () => API.get("/timetable/slots");
export const exportPDF = (className) => API.get(`/timetable/export/pdf/${className}`, { responseType: 'blob' });
export const exportExcel = (className) => API.get(`/timetable/export/excel/${className}`, { responseType: 'blob' });

// Classes
export const createClass = (data) => API.post("/classes/", data);
export const updateClass = (id, data) => API.put(`/classes/${id}`, data);
export const deleteClass = (id) => API.delete(`/classes/${id}`);
export const createTimetableEntry = (data) => API.post("/timetable/", data);
export const updateTimetableEntry = (id, data) => API.put(`/timetable/${id}`, data);

export const reschedule = (date, day = null) =>
  API.post("/timetable/reschedule", { date, day });

// ── Attendance ────────────────────────────────────────────────────────────────
export const markAttendance = (teacher_id, date, status) =>
  API.post("/attendance/", { teacher_id, date, status });

export const getTodayAttendance = () => API.get("/attendance/today");
export const getTeacherAttendance = (id) =>
  API.get(`/attendance/teacher/${id}`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getWorkload = (params = {}) => API.get("/analytics/workload", { params });
export const getRoomUtilization = (params = {}) => API.get("/analytics/room-utilization", { params });
export const getSubjectDistribution = (params = {}) =>
  API.get("/analytics/subject-distribution", { params });
export const getSummary = (params = {}) => API.get("/analytics/summary", { params });
export const getAttendanceTrends = () => API.get("/analytics/attendance-trends");
export const getDayLoad = (params = {}) => API.get("/analytics/day-load", { params });
export const getDepartmentLoad = (params = {}) => API.get("/analytics/department-load", { params });
export const getHeatmap = (params = {}) => API.get("/analytics/heatmap", { params });

// ── Leaves (admin) ────────────────────────────────────────────────────────────
export const getLeaveRequests = (params = {}) => API.get("/leaves/", { params });
export const updateLeaveStatus = (id, status) =>
  API.put(`/leaves/${id}`, { status });

export default API;
