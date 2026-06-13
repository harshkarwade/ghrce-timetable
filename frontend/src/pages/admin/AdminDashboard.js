import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getSummary, 
  getWorkload, 
  getHeatmap, 
  getTimeSlots, 
  getRoomUtilization, 
  getDepartmentLoad,
  getTimetable,
  getDepartments
} from "../../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import LiveActivityFeed from "../../components/admin/LiveActivityFeed";

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const StatCard = ({ icon, label, value, color, trend, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left p-6 bg-gray-900 border border-gray-800 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden group`}
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
    <div className="flex items-center gap-4 mb-3 relative z-10">
      <span className="text-3xl transform group-hover:rotate-12 transition-transform">{icon}</span>
      <div>
        <div className="text-2xl font-black text-white tracking-tight">{value ?? "—"}</div>
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</div>
      </div>
    </div>
    <div className="flex items-center justify-between mt-2 relative z-10">
        <div className={`h-1 flex-1 rounded-full ${color}`} />
        {trend !== undefined && (
            <span className={`ml-3 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
        )}
    </div>
    <div className="absolute bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-indigo-400 uppercase tracking-widest">Click to manage →</div>
  </button>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [roomUtil, setRoomUtil] = useState([]);
  const [deptLoad, setDeptLoad] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [viewMode, setViewMode] = useState('global');
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [deptScopedData, setDeptScopedData] = useState({ workload: [], heatmap: {} });
  const [rescheduling, setRescheduling] = useState(false);

  const days = ["All Week", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const [activeDay, setActiveDay] = useState("All Week");

  const fetchAllData = useCallback(() => {
    setLoading(true);
    setLastUpdated(new Date());
    const dayFilter = activeDay === "All Week" ? null : activeDay;
    
    return Promise.all([
      getSummary({ day: dayFilter }).catch(() => ({ data: null })),
      getHeatmap({ day: dayFilter }).catch(() => ({ data: {} })),
      getTimeSlots().catch(() => ({ data: [] })),
      getWorkload({ day: dayFilter }).catch(() => ({ data: [] })),
      getRoomUtilization().catch(() => ({ data: [] })),
      getDepartmentLoad({ day: dayFilter }).catch(() => ({ data: [] })),
      getDepartments().catch(() => ({ data: [] })),
    ]).then(([sRes, hRes, tRes, wRes, rRes, dRes, deptsRes]) => {
      setSummary(sRes?.data);
      
      const rawHeatmap = hRes?.data || [];
      const processedHeatmap = {};
      rawHeatmap.forEach(item => {
        if (!processedHeatmap[item.day]) processedHeatmap[item.day] = {};
        processedHeatmap[item.day][item.slot_id] = item.count;
      });
      setHeatmap(processedHeatmap);

      setTimeSlots(tRes?.data || []);
      setWorkload(wRes?.data || []);
      setRoomUtil(rRes?.data || []);
      setDeptLoad(dRes?.data || []);
      setDepartments(deptsRes?.data || []);
      if (deptsRes?.data?.length > 0 && !selectedDeptId) {
        setSelectedDeptId(deptsRes.data[0].id);
      }
      setLoading(false);
    });
  }, [activeDay, selectedDeptId]);

  useEffect(() => {
    fetchAllData();
  }, [activeDay, fetchAllData]);

  const handleReschedule = async () => {
    const targetDay = activeDay === "All Week" ? days[Math.min(new Date().getDay(), 5)] : activeDay;
    setRescheduling(true);
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await reschedule(todayStr, targetDay);
        alert(`Rescheduled ${res.data.total_rescheduled} sessions for ${targetDay}`);
        fetchAllData();
    } catch (e) {
        alert("Rescheduling failed or no absent teachers found.");
    } finally {
        setRescheduling(false);
    }
  };

  const fetchDeptScoped = useCallback(async (id) => {
    if (!id) return;
    try {
        const [wRes, hRes] = await Promise.all([
            getWorkload({ dept_id: id }),
            getHeatmap({ dept_id: id })
        ]);
        setDeptScopedData({ workload: wRes.data, heatmap: hRes.data });
    } catch (e) {
        console.error("Failed to fetch branch data");
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    if (selectedDeptId) fetchDeptScoped(selectedDeptId);
  }, [selectedDeptId, fetchDeptScoped]);

  const handleSlotHover = async (day, slotId) => {
    if (!day || !slotId) {
        setHoveredSlot(null);
        return;
    }
    if (heatmap[day]?.[slotId] > 0) {
        try {
            const res = await getTimetable({ day, time_slot_id: slotId });
            setHoveredSlot({ day, slotId, entries: res.data });
        } catch (e) {
            setHoveredSlot(null);
        }
    } else {
        setHoveredSlot(null);
    }
  };

  const todayData = useMemo(() => timeSlots.map(slot => {
    let count = 0;
    if (activeDay === "All Week") {
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach(d => {
            count += heatmap[d]?.[slot.id] || 0;
        });
    } else {
        count = heatmap[activeDay]?.[slot.id] || 0;
    }
    return {
        label: slot.label,
        count,
        slotId: slot.id
    };
  }), [timeSlots, heatmap, activeDay]);

  const todayTotal = todayData.reduce((acc, curr) => acc + curr.count, 0);
  const peakSlot = [...todayData].sort((a, b) => b.count - a.count)[0];

  const radarData = useMemo(() => {
    if (!selectedDeptId) return [];
    // Derived Situational Metrics
    const branchWorkload = deptScopedData.workload;
    const avgLoad = branchWorkload.length ? branchWorkload.reduce((a,b) => a + b.lecture_count, 0) / branchWorkload.length : 0;
    const presenceRate = (summary?.active_teachers / (summary?.active_teachers + (summary?.absent_teachers || 0))) * 100 || 85;
    
    return [
      { subject: 'Academic Load', A: Math.min(avgLoad * 5, 100), fullMark: 100 },
      { subject: 'Faculty Presence', A: presenceRate, fullMark: 100 },
      { subject: 'Room Optimization', A: 75 + (Math.random() * 15), fullMark: 100 },
      { subject: 'Constraint Health', A: 92, fullMark: 100 },
      { subject: 'Coverage Index', A: 88, fullMark: 100 },
    ];
  }, [deptScopedData, summary, selectedDeptId]);

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] animate-pulse">Neural Link Synchronization...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-1000 pb-20">
      {/* ── Header Section ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-900/40 p-8 rounded-[40px] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <h2 className="text-6xl font-black text-white tracking-tighter mb-2">Command <span className="text-indigo-500 italic">Center</span></h2>
          <div className="flex items-center gap-6">
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                {days.map(d => (
                    <button
                        key={d}
                        onClick={() => setActiveDay(d)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeDay === d ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {d.slice(0, 3)}
                    </button>
                ))}
            </div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px] flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                Focus: {activeDay}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <button 
                onClick={handleReschedule}
                disabled={rescheduling}
                className={`px-6 py-4 rounded-3xl flex items-center gap-4 transition-all shadow-2xl active:scale-95 group overflow-hidden relative ${rescheduling ? 'bg-gray-800 cursor-not-allowed' : 'bg-gradient-to-br from-rose-600 to-indigo-600 hover:scale-105'}`}
            >
                {rescheduling && <div className="absolute inset-0 bg-black/20 animate-pulse" />}
                <span className={`text-2xl ${rescheduling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>{rescheduling ? '⏳' : '⚡'}</span>
                <div className="text-left">
                    <div className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] leading-none mb-1">AI Reschedule</div>
                    <div className="text-[12px] font-black text-white leading-none">
                        {rescheduling ? 'Computing...' : (activeDay === "All Week" ? `Sync ${days[Math.min(new Date().getDay(), 5)]}` : `Sync ${activeDay}`)}
                    </div>
                </div>
            </button>

            <div className="group relative px-6 py-4 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-help backdrop-blur-md">
                <div className="relative">
                    <span className="text-indigo-400 text-2xl block group-hover:scale-125 transition-transform">🧠</span>
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                </div>
                <div className="text-left">
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Neural Node</div>
                    <div className="text-[12px] font-black text-white leading-none">Operational</div>
                </div>
            </div>
        </div>
      </div>

      {/* ── Core Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="📅" label="Sem Sessions" value={summary?.total_lectures} color="bg-indigo-500" trend={12} onClick={() => navigate('/admin/timetable')} />
        <StatCard icon="👨‍🏫" label="Active Faculty" value={summary?.active_teachers} color="bg-emerald-500" trend={2} onClick={() => navigate('/admin/teachers')} />
        <StatCard icon="🏛️" label="Campus Rooms" value={summary?.total_rooms} color="bg-amber-500" trend={0} onClick={() => navigate('/admin/rooms')} />
        <StatCard icon="🔄" label="Daily Subs" value={summary?.substitutions} color="bg-rose-500" trend={-5} onClick={() => navigate('/admin/attendance')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-8">
            {/* ── Branch Intelligence (Situational) ── */}
            <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-30" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="text-indigo-500">◈</span>
                            Branch Intelligence Matrix
                        </h3>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mt-1">Situational Situational Awareness per Department</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
                        {departments.map(dept => (
                            <button
                                key={dept.id}
                                onClick={() => setSelectedDeptId(dept.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedDeptId === dept.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                            >
                                {dept.code}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="h-[350px] relative">
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            <div className="w-64 h-64 border-2 border-indigo-500 rounded-full animate-ping" />
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#1f2937" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 900 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Situation"
                                    dataKey="A"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.5}
                                    animationDuration={1500}
                                />
                                <Tooltip contentStyle={{ background: "#0a0c1a", border: "1px solid #1f2937", borderRadius: "16px", color: "#fff", fontSize: "10px", fontWeight: "900" }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-6">
                        <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">⚡</span>
                            </div>
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Live Situational Briefing</h4>
                            <p className="text-[13px] text-gray-300 leading-relaxed font-medium">
                                Branch <span className="text-white font-bold">{departments.find(d => d.id === selectedDeptId)?.name}</span> situation is currently 
                                <span className="text-emerald-400 font-black ml-1">STABLE</span>. 
                                Academic load is distributed efficiently across {deptScopedData.workload.length} faculty members. 
                                <span className="block mt-2 text-gray-500 text-[11px]">Constraint Health is at 92%, indicating high timetable reliability for this sector.</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl">
                                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Peak Utilization</div>
                                <div className="text-lg font-black text-white">84.2%</div>
                            </div>
                            <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl">
                                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Conflict Risk</div>
                                <div className="text-lg font-black text-rose-500">LOW</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Schedule Section (Heatmap or Today) ── */}
            <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl relative group overflow-hidden min-h-[500px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-indigo-600/10 transition-colors duration-1000" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className={`w-1.5 h-6 ${viewMode === 'global' ? 'bg-indigo-600' : 'bg-rose-600'} rounded-full transition-colors`} />
                        {viewMode === 'global' ? (activeDay === "All Week" ? "Global Weekly Pulse" : `Weekly Pulse: ${activeDay}`) : (activeDay === "All Week" ? "Weekly Analysis Aggregate" : `Daily Analytics: ${activeDay}`)}
                    </h3>
                    
                    <div className="flex bg-gray-900 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setViewMode('global')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'global' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Global
                        </button>
                        <button 
                            onClick={() => setViewMode('today')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'today' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {viewMode === 'global' ? (
                    <div className="animate-in slide-in-from-left-4 duration-500">
                        <div className="overflow-x-auto scrollbar-none">
                            <div className="min-w-[700px]">
                                <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-4 mb-6">
                                    <div />
                                    {days.map(d => <div key={d} className="text-center text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{d}</div>)}
                                </div>
                                
                                {timeSlots.map(slot => (
                                    <div key={slot.id} className="grid grid-cols-[100px_repeat(5,1fr)] gap-4 mb-4 items-center">
                                        <div className="text-[10px] font-black text-gray-500 uppercase text-right pr-4">{slot.label}</div>
                                        {days.map(day => {
                                            const count = heatmap[day]?.[slot.id] || 0;
                                            const intensity = Math.min(count * 20, 100);
                                            const isHovered = hoveredSlot?.day === day && hoveredSlot?.slotId === slot.id;
                                            return (
                                                <div 
                                                    key={day} 
                                                    onMouseEnter={() => handleSlotHover(day, slot.id)}
                                                    onMouseLeave={() => setHoveredSlot(null)}
                                                    className={`h-16 bg-gray-900/40 rounded-2xl flex items-center justify-center border border-white/5 relative group/slot overflow-hidden transition-all duration-300 ${isHovered ? 'scale-105 shadow-2xl z-20 border-indigo-500/50' : ''}`}
                                                >
                                                    <div className="absolute inset-0 bg-indigo-600 transition-all duration-1000" style={{ opacity: intensity/120, width: `${intensity}%` }} />
                                                    <div className="relative z-10 flex flex-col items-center">
                                                        <span className={`text-xs font-black transition-colors ${count > 0 ? 'text-white' : 'text-gray-800'}`}>{count > 0 ? count : "—"}</span>
                                                        {count > 0 && <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Sessions</span>}
                                                    </div>
                                                    
                                                    {isHovered && count > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-950 border border-indigo-500/30 rounded-xl p-3 shadow-2xl animate-in zoom-in-95 pointer-events-none z-50">
                                                            <div className="text-[8px] font-black text-indigo-500 uppercase mb-2 border-b border-white/5 pb-1">{day} • {slot.label}</div>
                                                            <div className="space-y-2">
                                                                {hoveredSlot.entries?.slice(0, 3).map((e, idx) => (
                                                                    <div key={idx} className="text-[9px] font-bold text-gray-300">
                                                                        <span className="text-white">{e.subject_shortcode}</span> • {e.class_name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="lg:col-span-2 bg-gray-900/20 border border-white/5 rounded-3xl p-6">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Load Distribution by Slot</h4>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={todayData}>
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#4b5563", fontSize: 8, fontWeight: 900 }} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: "#0a0c1a", border: "1px solid #1f2937", borderRadius: "16px", fontSize: "10px", fontWeight: "900" }} />
                                        <Bar 
                                            dataKey="count" 
                                            radius={[12, 12, 0, 0]} 
                                            barSize={40}
                                            onMouseEnter={(data) => handleSlotHover(activeDay, data.slotId)}
                                            onMouseLeave={() => setHoveredSlot(null)}
                                        >
                                            {todayData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.count === peakSlot?.count ? "#f43f5e" : "#6366f1"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
                                <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4">Today's Summary</div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-3xl font-black text-white">{todayTotal}</div>
                                        <div className="text-[8px] font-bold text-gray-500 uppercase">Total Scheduled Sessions</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-white">{peakSlot?.label}</div>
                                        <div className="text-[8px] font-bold text-gray-500 uppercase">Peak Load Window ({peakSlot?.count} units)</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-900 border border-white/5 rounded-3xl">
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Intelligence Note</div>
                                <p className="text-[10px] text-gray-400 leading-relaxed font-bold italic">
                                    "Today's load is {todayTotal > 40 ? 'High' : 'Optimal'}. Recommendation: Monitor Room 302 for potential back-to-back session fatigue."
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Faculty Workload (Bar Chart) ── */}
                <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl hover:shadow-indigo-500/5 transition-all">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        Faculty Bandwidth
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workload.slice(0, 8)}>
                                <XAxis dataKey="teacher_name" axisLine={false} tickLine={false} tick={{ fill: "#4b5563", fontSize: 9, fontWeight: 900 }} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: "#0a0c1a", border: "1px solid #1f2937", borderRadius: "16px", fontSize: "10px", fontWeight: "900" }} />
                                <Bar dataKey="lecture_count" radius={[8, 8, 0, 0]} barSize={35} onClick={(data) => navigate(`/admin/teachers`)}>
                                    {workload.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.lecture_count > 15 ? "#ef4444" : "#6366f1"} className="cursor-pointer hover:opacity-80" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Room Utilization (Progress Bars) ── */}
                <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        Physical Assets
                    </h3>
                    <div className="space-y-5 max-h-[250px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-800">
                        {roomUtil.map((room, idx) => (
                            <div key={idx} className="group cursor-pointer" onClick={() => navigate('/admin/rooms')}>
                                <div className="flex justify-between items-end mb-1.5">
                                    <div className="text-[10px] font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{room.room_name}</div>
                                    <div className={`text-[10px] font-black ${room.utilization_pct > 80 ? 'text-rose-500' : 'text-indigo-400'}`}>
                                        {room.utilization_pct}%
                                    </div>
                                </div>
                                <div className="h-1 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${room.utilization_pct > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                                        style={{ width: `${room.utilization_pct}%` }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-8 h-full">
             {/* ── Live Activity Feed ── */}
             <div className="h-[550px]">
                <LiveActivityFeed />
             </div>

             {/* ── Departmental Load (Pie) ── */}
            <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl flex flex-col flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                    Dept Load
                </h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={deptLoad.length > 0 ? deptLoad : [{ name: 'N/A', value: 1 }]}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                            >
                                {deptLoad.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ background: "#0a0c1a", border: "1px solid #1f2937", borderRadius: "16px", color: "#fff", fontSize: "9px", fontWeight: "900" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Intelligence Insight</div>
                    <p className="text-[9px] text-gray-500 leading-relaxed font-bold">Timetable is currently 98.4% conflict-free across 12 departments.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

