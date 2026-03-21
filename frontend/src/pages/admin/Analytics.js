import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getWorkload, getRoomUtilization, getSubjectDistribution, getSummary, getAttendanceTrends } from "../../services/api";

const COLORS_PIE = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#14b8a6"];

const StatCard = ({ title, value, icon, colorFrom, colorTo, subtitle }) => (
  <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-600 transition-all duration-300 shadow-lg">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorFrom} ${colorTo} opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`} />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</h3>
        <div className="text-3xl font-black text-white mt-1 filter drop-shadow-md">{value ?? '--'}</div>
        {subtitle && <p className="text-[10px] text-gray-500 mt-2">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${colorFrom} ${colorTo} shadow-lg border border-white/10 text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Analytics() {
  const [workload, setWorkload] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    getWorkload().then(r => setWorkload(r.data)).catch(() => {});
    getRoomUtilization().then(r => setRooms(r.data)).catch(() => {});
    getSubjectDistribution().then(r => setSubjects(r.data)).catch(() => {});
    getSummary().then(r => setSummary(r.data)).catch(() => {});
    getAttendanceTrends().then(r => setAttendance(r.data)).catch(() => {});
  }, []);

  const workloadChart = workload.map(w => ({ name: w.teacher_name.split(" ").slice(-1)[0], lectures: w.lecture_count }));
  const roomChart = rooms.map(r => ({ name: r.room_name, pct: r.utilization_pct }));
  
  const presentCount = attendance?.teacher?.present || 0;
  const absentCount = attendance?.teacher?.absent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gray-900/40 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400 shadow-inner">📈</span> 
            Command Center Analytics
          </h2>
          <p className="text-gray-400 text-sm mt-1">Real-time scheduling insights, workload metrics, and campus utilization</p>
        </div>
        <div className="bg-gray-950 px-4 py-2 border border-gray-800 rounded-lg text-xs font-bold text-emerald-400 shadow-inner flex items-center gap-2 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Metrics Update
        </div>
      </div>

      {/* Summary Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Lectures" 
          value={summary?.total_lectures} 
          icon="📅" 
          colorFrom="from-indigo-600" 
          colorTo="to-blue-600"
          subtitle="Scheduled across all branches"
        />
        <StatCard 
          title="Active Faculty" 
          value={summary?.active_teachers} 
          icon="👨‍🏫" 
          colorFrom="from-emerald-600" 
          colorTo="to-teal-600"
          subtitle="Currently marked as present"
        />
        <StatCard 
          title="Campus Rooms" 
          value={summary?.total_rooms} 
          icon="🏢" 
          colorFrom="from-amber-500" 
          colorTo="to-orange-600"
          subtitle="Labs and Lecture Halls"
        />
        <StatCard 
          title="Substituted" 
          value={summary?.substitutions} 
          icon="🔄" 
          colorFrom="from-rose-500" 
          colorTo="to-pink-600"
          subtitle="Absentee re-assignments"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workload Bar Chart (Spans 2 columns on lg) */}
        <div className="lg:col-span-2 bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-white pointer-events-none">01</div>
          <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block" /> Faculty Workload Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={workloadChart} margin={{ left: -20, bottom: 0, top: 10 }}>
              <defs>
                <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#374151', opacity: 0.2 }} contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid #374151", borderRadius: 12, color: "#f9fafb", backdropFilter: "blur(8px)" }} />
              <Bar dataKey="lectures" fill="url(#colorWorkload)" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Donut Chart */}
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 shadow-xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-white pointer-events-none">02</div>
          <h3 className="text-base font-bold text-gray-200 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-pink-500 rounded-full inline-block" /> Domain Assortment
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie 
                data={subjects} 
                dataKey="count" 
                nameKey="subject" 
                cx="50%" 
                cy="45%" 
                innerRadius={60}
                outerRadius={85} 
                paddingAngle={4}
                cornerRadius={5}
                stroke="none"
              >
                {subjects.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.3))" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid #374151", borderRadius: 12, color: "#f9fafb" }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "10px", color: "#9ca3af", paddingTop: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Room Utilization Bar Chart */}
        <div className="lg:col-span-2 bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-white pointer-events-none">03</div>
          <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block" /> Physical Asset Utilization %
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roomChart} margin={{ left: -20, top: 10 }}>
              <defs>
                <linearGradient id="colorRoom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip cursor={{ fill: '#374151', opacity: 0.2 }} contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid #374151", borderRadius: 12, color: "#f9fafb", backdropFilter: "blur(8px)" }} formatter={(v) => [`${parseFloat(v).toFixed(1)}%`, "Utilization"]} />
              <Bar dataKey="pct" fill="url(#colorRoom)" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance/Workload Details List */}
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 shadow-xl flex flex-col relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-white pointer-events-none">04</div>
          <h3 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full inline-block" /> Faculty Bandwidth
          </h3>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[220px]">
            {workload.sort((a,b)=> b.lecture_count - a.lecture_count).map((w, idx) => {
              const pct = Math.min((w.lecture_count / 20) * 100, 100);
              return (
                <div key={w.teacher_id} className="group flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-700/50">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-xs font-black text-white shadow-lg border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      {w.avatar || w.teacher_name.charAt(0).toUpperCase()}
                    </div>
                    {w.status === 'absent' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-gray-900 shadow-sm" title="Absent" />}
                    {w.status === 'present' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-gray-900 shadow-sm" title="Present" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5 mt-0.5">
                      <span className="text-[11px] font-bold text-gray-200 truncate group-hover:text-indigo-300 transition-colors uppercase tracking-wide">{w.teacher_name}</span>
                      <span className="text-[10px] font-black text-gray-400 bg-black/30 px-2 flex items-center rounded-md border border-gray-800">{w.lecture_count} HRS</span>
                    </div>
                    <div className="h-1.5 bg-gray-950/80 rounded-full overflow-hidden border border-gray-800/50">
                      <div className={`h-full rounded-full transition-all duration-1000 ${pct > 80 ? "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : pct > 50 ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"}`} style={{ width: `${pct}%` }} />
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
