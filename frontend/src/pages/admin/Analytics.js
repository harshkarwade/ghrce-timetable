import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getWorkload, getRoomUtilization, getSubjectDistribution } from "../../services/api";

const COLORS_PIE = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899"];

export default function Analytics() {
  const [workload, setWorkload] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    getWorkload().then(r => setWorkload(r.data)).catch(() => {});
    getRoomUtilization().then(r => setRooms(r.data)).catch(() => {});
    getSubjectDistribution().then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  const workloadChart = workload.map(w => ({ name: w.teacher_name.split(" ").pop(), lectures: w.lecture_count }));
  const roomChart = rooms.map(r => ({ name: r.room_name, pct: r.utilization_pct }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
        <p className="text-gray-400 text-sm mt-0.5">Scheduling insights and utilization metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Teacher Workload (Lectures)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={workloadChart} margin={{ left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }} />
              <Bar dataKey="lectures" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Subject Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={subjects} dataKey="count" nameKey="subject" cx="50%" cy="50%" outerRadius={70} label={({ subject }) => subject?.split(" ")[0]}>
                {subjects.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Room Utilization %</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roomChart} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }} formatter={(v) => [`${v}%`, "Utilization"]} />
              <Bar dataKey="pct" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Workload Details</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {workload.map(w => {
              const pct = Math.min((w.lecture_count / 10) * 100, 100);
              return (
                <div key={w.teacher_id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{w.avatar || "?"}</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs text-gray-300 truncate">{w.teacher_name}</span>
                      <span className="text-xs text-gray-400 ml-1">{w.lecture_count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
