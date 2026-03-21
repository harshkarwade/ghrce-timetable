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
  { to: "/admin/classes", label: "Manage Classes", icon: "🏫" },
  { to: "/admin/subjects", label: "Manage Subjects", icon: "📚" },
  { to: "/admin/rooms", label: "Manage Rooms", icon: "🏢" },
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
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-64"} flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-300 no-print`}>
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">G</div>
              <div>
                <div className="text-sm font-black tracking-tight">GHRCE</div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Admin Portal</div>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 ml-auto">
            {collapsed ? "→" : "←"}
          </button>
        </div>
        
        {!collapsed && (
          <div className="px-4 py-4">
            <div className="bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse"></span>
              Administrative Access
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--accent-soft)]"}`
              }>
              <span className={`text-lg flex-shrink-0 transition-transform group-hover:scale-110`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border-subtle)]">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all">
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 flex items-center justify-between flex-shrink-0 z-20 no-print">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-[var(--text-muted)] tracking-tight hidden sm:inline">GH Raisoni College of Engineering</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">AI Optimizer Live</span>
            </div>
            <div className="h-6 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--bg-main)]">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
