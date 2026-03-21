import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/authStore";
import useThemeStore from "./store/themeStore";
import { getMe } from "./services/api";

// Pages
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import TeacherLayout from "./pages/teacher/TeacherLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import GenerateTimetable from "./pages/admin/GenerateTimetable";
import MasterTimetable from "./pages/admin/MasterTimetable";
import TeacherTimetables from "./pages/admin/TeacherTimetables";
import RoomTimetables from "./pages/admin/RoomTimetables";
import ManageTeachers from "./pages/admin/ManageTeachers";
import ManageClasses from "./pages/admin/ManageClasses";
import ManageSubjects from "./pages/admin/ManageSubjects";
import ManageRooms from "./pages/admin/ManageRooms";
import AttendanceReschedule from "./pages/admin/AttendanceReschedule";
import Analytics from "./pages/admin/Analytics";
import AdminLeaveRequests from "./pages/admin/AdminLeaveRequests";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyTimetable from "./pages/teacher/MyTimetable";
import MyAttendance from "./pages/teacher/MyAttendance";
import LeaveApplication from "./pages/teacher/LeaveApplication";
import MyWorkload from "./pages/teacher/MyWorkload";

function ProtectedRoute({ children, requiredRole }) {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  
  // Admin can access everything; others go to their portal
  if (requiredRole === "admin" && role !== "admin") return <Navigate to={`/${role}`} replace />;
  if (requiredRole === "teacher" && role !== "teacher" && role !== "admin") return <Navigate to="/login" replace />;
  
  return children;
}

export default function App() {
  const { token, setUser, logout } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      getMe()
        .then(r => setUser(r.data))
        .catch(err => {
          // Only logout on 401 (invalid token), not other errors
          if (err.response?.status === 401) logout();
        });
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1f2937", color: "#f9fafb", border: "1px solid #374151" },
          success: { iconTheme: { primary: "#10b981", secondary: "#f9fafb" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f9fafb" } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="generate" element={<GenerateTimetable />} />
          <Route path="timetable" element={<MasterTimetable />} />
          <Route path="teacher-timetables" element={<TeacherTimetables />} />
          <Route path="room-timetables" element={<RoomTimetables />} />
          <Route path="teachers" element={<ManageTeachers />} />
          <Route path="classes" element={<ManageClasses />} />
          <Route path="subjects" element={<ManageSubjects />} />
          <Route path="rooms" element={<ManageRooms />} />
          <Route path="attendance" element={<AttendanceReschedule />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="leaves" element={<AdminLeaveRequests />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherLayout /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="timetable" element={<MyTimetable />} />
          <Route path="master-timetable" element={<MasterTimetable />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="leave" element={<LeaveApplication />} />
          <Route path="workload" element={<MyWorkload />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
