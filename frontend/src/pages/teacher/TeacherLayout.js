// TeacherLayout.js
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/teacher", label: "My Dashboard", icon: "⊞", end: true },
  { to: "/teacher/timetable", label: "My Timetable", icon: "📅" },
  { to: "/teacher/master-timetable", label: "Master Timetable", icon: "🗓️" },
  { to: "/teacher/attendance", label: "My Attendance", icon: "✅" },
  { to: "/teacher/leave", label: "Leave Application", icon: "🌴" },
  { to: "/teacher/workload", label: "My Workload", icon: "📊" },
];

export default function TeacherLayout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      <aside className="w-56 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 flex flex-col transition-all duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50">
          <div className="text-sm font-bold text-white">GHRCE</div>
          <div className="text-[10px] text-gray-400">Teacher Portal</div>
        </div>
        <div className="px-4 py-2">
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">👤 Teacher</span>
        </div>
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"}`
              }>
              <span>{item.icon}</span> <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/50">
          <button onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10">
            🚪 Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/90 dark:bg-gray-950/90 border-b border-gray-200 dark:border-gray-700/50 px-6 py-3 flex items-center justify-between transition-colors duration-300">
          <span className="text-sm font-semibold text-gray-300">GH Raisoni College — Teacher Portal</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{new Date().toLocaleDateString("en-IN")}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
