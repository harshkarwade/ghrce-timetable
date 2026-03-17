import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: "⊞", end: true },
  { to: "/admin/generate", label: "Generate AI Timetable", icon: "⚡" },
  { to: "/admin/timetable", label: "Master Timetable", icon: "📅" },
  { to: "/admin/teacher-timetables", label: "Teacher Timetables", icon: "👩‍🏫" },
  { to: "/admin/room-timetables", label: "Room / Lab Timetables", icon: "🏛️" },
  { to: "/admin/teachers", label: "Manage Teachers", icon: "👥" },
  { to: "/admin/leaves", label: "Leave Requests", icon: "🌴" },
  { to: "/admin/attendance", label: "Attendance & Reschedule", icon: "✅" },
  { to: "/admin/analytics", label: "Analytics", icon: "📊" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-white">GHRCE</div>
              <div className="text-[10px] text-gray-400">Admin Portal</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white p-1 ml-auto">
            {collapsed ? "→" : "←"}
          </button>
        </div>
        {!collapsed && (
          <div className="px-4 py-2">
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">🔑 Admin</span>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"}`
              }>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/50">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-700/50 px-6 py-3 flex items-center justify-between flex-shrink-0 transition-colors duration-300">
          <span className="text-sm font-semibold text-gray-300">GH Raisoni College of Engineering</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">AI Active</span>
            </div>
            <span className="text-xs text-gray-500 mr-2">{new Date().toLocaleDateString("en-IN")}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
