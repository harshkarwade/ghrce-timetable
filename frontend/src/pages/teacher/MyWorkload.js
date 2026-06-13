import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MyWorkload() {
  const { teacherId } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester] = useState("2024-25");

  useEffect(() => {
    if (!teacherId) { setLoading(false); return; }
    const tid = parseInt(teacherId, 10);
    Promise.all([
      getTimetable({ teacher_id: tid, semester_year: semester }), 
      getTeachers()
    ])
      .then(([ttRes, tRes]) => {
        setEntries(ttRes.data || []);
        setTeacher(tRes.data.find((t) => t.id === tid) || null);
      })
      .catch(() => toast.error("Could not load workload data"))
      .finally(() => setLoading(false));
  }, [teacherId, semester]);

  const dayData = DAYS.map((day) => ({
    name: day.slice(0, 3),
    fullName: day,
    lectures: entries.filter((e) => e.day === day).length,
  }));

  const uniqueSubjects = [...new Set(entries.map((e) => e.subject_name))];
  const uniqueClasses = [...new Set(entries.map((e) => e.class_name))];
  const busiestDay = DAYS.reduce((a, d) =>
    entries.filter((e) => e.day === d).length > entries.filter((e) => e.day === a).length ? d : a,
    DAYS[0]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-sidebar)]/30 rounded-3xl border border-[var(--border-subtle)]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Analyzing Workload...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
             <span className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white text-2xl">📊</span> 
             My Workload
           </h1>
           <p className="text-[var(--text-muted)] font-medium mt-1">Teaching load distribution for <span className="text-[var(--text-main)] font-bold">{semester}</span>.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-6xl mb-6">🍃</div>
          <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">No Workload Data</h2>
          <p className="text-[var(--text-muted)] font-medium mt-2 max-w-sm">No sessions have been scheduled for you in the current session yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                    <span className="text-indigo-500">📈</span> Weekly distribution
                  </h3>
               </div>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayData}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 800 }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 800 }} 
                        axisLine={false} 
                        tickLine={false} 
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--bg-sidebar)', opacity: 0.4 }}
                        contentStyle={{ 
                          background: "var(--bg-card)", 
                          border: "1px solid var(--border-subtle)", 
                          borderRadius: '16px', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          padding: '12px'
                        }}
                        itemStyle={{ color: "var(--text-main)", fontSize: '12px', fontWeight: '800' }}
                        labelStyle={{ color: "var(--text-muted)", fontSize: '10px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}
                      />
                      <Bar dataKey="lectures" radius={[6, 6, 0, 0]} barSize={40}>
                        {dayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.lectures > 3 ? '#6366f1' : '#818cf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              {[
                { label: "Total Sessions", value: entries.length, icon: "🗓️" },
                { label: "Unique Subjects", value: uniqueSubjects.length, icon: "📖" },
                { label: "Classes Taught", value: uniqueClasses.length, icon: "🏫" },
                { label: "Busiest Day", value: busiestDay.slice(0, 3), icon: "⚡" },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-sm flex flex-col justify-center items-center text-center group hover:border-indigo-500/30 transition-all">
                  <span className="text-xl mb-2 group-hover:scale-110 transition-transform">{s.icon}</span>
                  <div className="text-2xl font-black text-[var(--text-main)] leading-none">{s.value}</div>
                  <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Course Breakdown */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="text-indigo-500">📑</span> Course Portfolio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacher?.subjects?.map((s) => (
                <div key={s.id} className="relative group bg-[var(--bg-sidebar)]/30 border border-[var(--border-subtle)] rounded-2xl p-5 hover:bg-[var(--bg-main)] hover:border-indigo-500/30 transition-all">
                  <div className="flex items-start justify-between">
                     <div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 italic">
                           {s.type === 'lab' ? 'Laboratory' : 'Theory Course'}
                        </div>
                        <div className="text-sm font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">
                           {s.name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-tighter opacity-80">
                           {s.code || 'COUR-' + s.id} • Credits: {s.type === 'lab' ? '2.0' : '4.0'}
                        </div>
                     </div>
                     <span className="text-xl opacity-20 group-hover:opacity-100 transition-opacity">
                        {s.type === 'lab' ? '🧪' : '📚'}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
