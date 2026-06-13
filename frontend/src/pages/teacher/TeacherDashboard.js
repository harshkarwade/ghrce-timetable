import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";
import useAuthStore from "../../store/authStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

export default function TeacherDashboard() {
  const { teacherId, user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester] = useState("2024-25");

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

  // Analytics
  const workloadData = [
    { name: "Theory", value: entries.filter(e => e.subject_type !== "lab").length },
    { name: "Laboratory", value: entries.filter(e => e.subject_type === "lab").length },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-sidebar)]/30 rounded-3xl border border-[var(--border-subtle)]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Initializing Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Today's Schedule ── */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-sidebar)]/30">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
              <span className="text-indigo-500">⚡</span> Today's Sessions
            </h3>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full uppercase italic">{todayName}</span>
          </div>
          
          <div className="p-4">
            {todayEntries.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-muted)] flex flex-col items-center">
                <span className="text-5xl mb-4 opacity-20">🍃</span>
                <p className="text-xs font-bold font-mono tracking-widest uppercase">No lectures scheduled for today.</p>
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

        {/* ── Workload Analytics (Chart) ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-xl p-8 flex flex-col">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="text-indigo-500">📊</span> Load Balance
            </h3>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={workloadData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {workloadData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ background: "#13162a", border: "1px solid #1f2937", borderRadius: "12px", fontSize: "10px", fontWeight: "900" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                {workloadData.map((d, i) => (
                    <div key={d.name} className="flex flex-col items-center p-3 rounded-2xl bg-[var(--bg-sidebar)]/30 border border-[var(--border-subtle)]">
                        <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{d.name}</span>
                        <span className="text-lg font-black text-[var(--text-main)]" style={{ color: COLORS[i] }}>{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

