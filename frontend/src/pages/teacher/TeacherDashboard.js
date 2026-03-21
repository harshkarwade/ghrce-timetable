import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

export default function TeacherDashboard() {
  const { teacherId, user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester] = useState("SUMMER 2026");

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    const tid = parseInt(teacherId, 10);

    Promise.all([
      getTimetable({ teacher_id: tid, semester_year: semester }),
      getTeachers(),
    ])
      .then(([ttRes, tRes]) => {
        setEntries(ttRes.data || []);
        const found = tRes.data.find((x) => x.id === tid);
        setTeacher(found || null);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        toast.error("Could not load dashboard data");
      })
      .finally(() => setLoading(false));
  }, [teacherId, semester]);

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayEntries = entries.filter((e) => e.day === todayName);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-sidebar)]/30 rounded-3xl border border-[var(--border-subtle)]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Initializing Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Welcome Section ── */}
      <div className="relative group overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-600/10 transition-all duration-700" />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-3xl font-black text-white transform group-hover:scale-110 transition-transform duration-500">
            {teacher?.name?.charAt(0) || user?.teacher_name?.charAt(0) || "T"}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-[var(--text-main)] leading-tight">
              Welcome back, <span className="text-indigo-500">{teacher?.name || user?.teacher_name || "Faculty"}</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
              <span className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="text-lg">🏛️</span> {teacher?.department?.name || "GHRCE Faculty"}
              </span>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                teacher?.status === "present"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/30"
              }`}>
                {teacher?.status || "present"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "📖", label: "Today's Lectures", value: todayEntries.length, sub: todayName, color: "indigo" },
          { icon: "📅", label: "Weekly Workload", value: entries.length, sub: "Total Sessions", color: "purple" },
          { icon: "📚", label: "Assigned Subjects", value: teacher?.subjects?.length || 0, sub: "Courses taught", color: "amber" },
        ].map((s) => (
          <div key={s.label} className="group relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300">
            <div className={`p-3 rounded-2xl bg-${s.color}-500/10 w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div className="text-4xl font-black text-[var(--text-main)] mb-1">{s.value}</div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
            <div className="text-[10px] text-indigo-500 font-bold mt-1 opacity-70 italic">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Today's Schedule ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-sidebar)]/30">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
              <span className="text-indigo-500">⚡</span> Today's Sessions
            </h3>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full uppercase italic">{todayName}</span>
          </div>
          
          <div className="p-4">
            {todayEntries.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)] flex flex-col items-center">
                <span className="text-4xl mb-3 opacity-20">🍃</span>
                <p className="text-xs font-bold font-mono">No lectures scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEntries
                  .sort((a, b) => (a.time_slot_id || 0) - (b.time_slot_id || 0))
                  .map((e, i) => (
                    <div key={i} className="group flex items-center gap-5 p-4 rounded-2xl bg-[var(--bg-sidebar)]/20 border border-transparent hover:border-indigo-500/30 hover:bg-[var(--bg-main)] transition-all duration-300">
                      <div className="text-[10px] font-black font-mono text-indigo-500 w-28 flex-shrink-0 bg-indigo-500/5 p-2 rounded-xl text-center border border-indigo-500/10">
                        {e.time_slot_label}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">{e.subject_name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5 opacity-80 uppercase tracking-tight">
                          {e.class_name} • {e.room_name}
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm ${
                        e.subject_type === 'lab' 
                          ? 'bg-amber-500/20 text-amber-600 border border-amber-500/20' 
                          : 'bg-indigo-500/20 text-indigo-600 border border-indigo-500/20'
                      }`}>
                        {e.subject_type || "theory"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ── My Courses ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-xl p-8">
          <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="text-indigo-500">📚</span> Academic Workload
          </h3>
          {teacher?.subjects?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {teacher.subjects.map((s) => (
                <div
                  key={s.id}
                  className="group flex flex-col gap-1 px-5 py-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 hover:border-indigo-500/50 transition-all cursor-default"
                >
                  <span className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-wider">{s.code || 'COUR'}</span>
                  <span className="text-sm font-black text-[var(--text-main)]">{s.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[var(--text-muted)] italic text-xs font-medium">
              No subjects assigned yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
