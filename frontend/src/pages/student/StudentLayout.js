import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const NAV = [
  { to: "/student", label: "My Dashboard", icon: "⊞", end: true },
  { to: "/student/timetable", label: "My Timetable", icon: "📅" },
  { to: "/student/attendance", label: "My Attendance", icon: "✅" },
  { to: "/student/noticeboard", label: "Noticeboard", icon: "📌" },
];

export default function StudentLayout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-700/50 flex flex-col">
        <div className="p-4 border-b border-gray-700/50">
          <div className="text-sm font-bold text-white">GHRCE</div>
          <div className="text-[10px] text-gray-400">Student Portal</div>
        </div>
        <div className="px-4 py-3 flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center justify-center font-bold text-xs">
            ST
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-200">{user?.name || "Student"}</div>
            <div className="text-[10px] text-emerald-400">Enrolled</div>
          </div>
        </div>
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"}`
              }>
              <span>{item.icon}</span> <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700/50">
          <button onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-950/90 border-b border-gray-700/50 px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            GH Raisoni College <span className="text-gray-600">/</span> <span className="text-emerald-400">Student Portal</span>
          </span>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black"><Outlet /></main>
      </div>
    </div>
  );
}
