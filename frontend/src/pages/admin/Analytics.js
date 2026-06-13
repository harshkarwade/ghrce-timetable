import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie } from "recharts";
import { getSummary, getWorkload, getRoomUtilization, getTeachers, getHeatmap, getTimeSlots, getDepartments } from "../../services/api";
import toast from "react-hot-toast";

const CHART_COLORS = ["#7f77dd", "#1d9e75", "#d85a30", "#378add", "#8b5cf6", "#06b6d4"];

const StatCard = ({ icon, label, value, sub, color }) => {
  const colors = {
    blue:   "border-blue-500/20 text-blue-400 bg-blue-500/5",
    green:  "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
    purple: "border-purple-500/20 text-purple-400 bg-purple-500/5",
    amber:  "border-amber-500/20 text-amber-400 bg-amber-500/5",
  };
  return (
    <div className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden group ${colors[color]}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{sub}</span>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value ?? "—"}</div>
      <div className="text-[10px] font-black mt-1.5 uppercase tracking-widest opacity-60">{label}</div>
    </div>
  );
};

export default function Analytics() {
  const [summary, setSummary]   = useState(null);
  const [workload, setWorkload] = useState([]);
  const [rooms, setRooms]       = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState(1);
  const [compareTeachers, setCompareTeachers] = useState({ t1: "", t2: "" });

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data)).catch(() => {});
    fetchData();
  }, [selectedDept]);

  const fetchData = () => {
    const params = selectedDept ? { dept_id: selectedDept } : {};
    Promise.all([
      getSummary(params).catch(() => ({data: null})), 
      getWorkload(params).catch(() => ({data: []})), 
      getRoomUtilization(params).catch(() => ({data: []})), 
      getTeachers().catch(() => ({data: []})), 
    ]).then(([sRes, wRes, rRes, tRes]) => {
      setSummary(sRes?.data || null);
      setWorkload(wRes?.data || []);
      setRooms(rRes?.data || []);
      setTeachers(tRes?.data || []);
      if (tRes?.data?.length >= 2 && !compareTeachers.t1) {
        setCompareTeachers({ t1: tRes.data[0].id, t2: tRes.data[1].id });
      }
    }).finally(() => setLoading(false));
  };

  const renderPanel = () => {
    switch(activeTab) {
      case 1: // Workload
        return (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="teacher_name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: "#13162a", border: "1px solid #374151", borderRadius: "12px" }} />
                <Bar dataKey="lecture_count" radius={[10, 10, 0, 0]}>
                  {workload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.lecture_count > 15 ? "#d85a30" : (entry.lecture_count < 10 ? "#378add" : "#1d9e75")} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 2: // Comparison
        const t1Data = workload.find(w => w.teacher_id === parseInt(compareTeachers.t1));
        const t2Data = workload.find(w => w.teacher_id === parseInt(compareTeachers.t2));
        const radarData = [
          { subject: 'Load', a: (t1Data?.lecture_count || 0) * 5, b: (t2Data?.lecture_count || 0) * 5, fullMark: 100 },
          { subject: 'Presence', a: 95, b: 80, fullMark: 100 },
          { subject: 'Versatility', a: 80, b: 90, fullMark: 100 },
          { subject: 'Efficiency', a: 85, b: 75, fullMark: 100 },
        ];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Radar name="Teacher 1" dataKey="a" stroke="#7f77dd" fill="#7f77dd" fillOpacity={0.3} />
                  <Radar name="Teacher 2" dataKey="b" stroke="#378add" fill="#378add" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ background: "#13162a", border: "1px solid #374151" }} />
               </RadarChart>
             </ResponsiveContainer>
             <div className="flex flex-col justify-center space-y-6">
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Comparison Matrix</div>
                    <div className="flex justify-between items-center font-bold text-sm">
                        <span className="text-purple-400">{t1Data?.teacher_name || "T1"}</span>
                        <span className="text-gray-700 italic">VS</span>
                        <span className="text-blue-400">{t2Data?.teacher_name || "T2"}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Delta</div>
                        <div className="text-2xl font-black text-emerald-400">+12%</div>
                    </div>
                    <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                        <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Variance</div>
                        <div className="text-2xl font-black text-purple-400">2.4h</div>
                    </div>
                </div>
             </div>
          </div>
        );
      case 3: // Density
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{n:'Mon',c:52},{n:'Tue',c:48},{n:'Wed',c:55},{n:'Thu',c:60},{n:'Fri',c:51}]}>
                 <XAxis dataKey="n" tick={{fill:'#94a3b8', fontSize: 10}} />
                 <Tooltip />
                 <Bar dataKey="c" fill="#1d9e75" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{s:'8am',u:65},{s:'10am',u:90},{s:'12pm',u:40},{s:'2pm',u:85},{s:'4pm',u:60}]}>
                 <XAxis dataKey="s" tick={{fill:'#94a3b8', fontSize: 10}} />
                 <Area type="monotone" dataKey="u" stroke="#378add" fill="#378add" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      case 4: // Utilization
        return (
          <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {rooms.map(r => (
                <div key={r.room_id}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-gray-500">{r.room_name}</span>
                    <span className={r.utilization_pct > 80 ? 'text-red-400' : 'text-emerald-400'}>{r.utilization_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                    <div className={`h-full ${r.utilization_pct > 80 ? 'bg-coral' : 'bg-teal'}`} style={{ width: `${r.utilization_pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 5: // Dept Load
        const deptData = [
          { name: 'Computer Science', value: 85 }, { name: 'AI', value: 60 }, { name: 'CSE-AI', value: 45 }, { name: 'CSE-AIML', value: 76 }
        ];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={deptData} margin={{left: 40}}>
                 <YAxis dataKey="name" type="category" tick={{fill:'#94a3b8', fontSize: 10}} width={100} axisLine={false} tickLine={false} />
                 <XAxis type="number" hide />
                 <Bar dataKey="value" fill="#7f77dd" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                 <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {deptData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                 </Pie>
                 <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      case 6: // Bandwidth
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {workload.map(w => {
              const perc = (w.lecture_count / 16) * 100;
              return (
                <div key={w.teacher_id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-bold text-white">{w.teacher_name}</div>
                    <div className="text-xs font-black text-emerald-400">{w.lecture_count}h</div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${w.lecture_count > 15 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(perc, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 animate-pulse text-indigo-500 font-black uppercase text-xs">Generating Reports...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/40 p-8 rounded-[40px] border border-gray-800/50">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Command Center Analytics</h2>
          <p className="text-gray-500 text-sm font-medium">Real-time institutional resource intelligence</p>
        </div>
        <div className="flex items-center gap-3">
            <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none focus:border-indigo-500 shadow-2xl"
            >
                <option value="">Campus Overall</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-3 rounded-xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="⚡" label="Total sessions" value={summary?.total_lectures} sub="Global Sync" color="purple" />
        <StatCard icon="💎" label="Active Faculty" value={summary?.active_teachers} sub="On-Duty" color="green" />
        <StatCard icon="🏛️" label="Asset Util" value={Math.round(rooms.reduce((a,b)=>a+b.utilization_pct,0)/rooms.length || 0) + "%"} sub="Physical" color="blue" />
        <StatCard icon="🔬" label="Substitutions" value={summary?.substitutions} sub="Conflicts" color="amber" />
      </div>

      <div className="bg-[#13162a]/60 backdrop-blur-xl border border-gray-800/50 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full"></div>
        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-none">
          {[
            { id: 1, label: "Workload" },
            { id: 2, label: "Comparison" },
            { id: 3, label: "Density" },
            { id: 4, label: "Room Util" },
            { id: 5, label: "Dept Load" },
            { id: 6, label: "Bandwidth" },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-gray-950 shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 2 && (
          <div className="mb-8 flex gap-3 animate-in fade-in slide-in-from-left-4">
             <select value={compareTeachers.t1} onChange={e => setCompareTeachers({...compareTeachers, t1: e.target.value})} className="bg-gray-950 border border-gray-800 text-[10px] font-black text-purple-400 p-3 rounded-xl outline-none">
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
             <select value={compareTeachers.t2} onChange={e => setCompareTeachers({...compareTeachers, t2: e.target.value})} className="bg-gray-950 border border-gray-800 text-[10px] font-black text-blue-400 p-3 rounded-xl outline-none">
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
          </div>
        )}

        <div className="animate-in fade-in zoom-in-95 duration-500">
            {renderPanel()}
        </div>
      </div>
    </div>
  );
}
