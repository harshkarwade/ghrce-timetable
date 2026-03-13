import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { getSummary, getWorkload, getRoomUtilization, getTeachers, getAttendanceTrends, getNotices, createNotice } from "../../services/api";
import toast from "react-hot-toast";

const CHART_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899"];

const StatCard = ({ icon, label, value, sub, color }) => {
  const colors = {
    blue:   "from-blue-600/20 to-blue-800/5 border-blue-500/20 text-blue-400",
    green:  "from-emerald-600/20 to-emerald-800/5 border-emerald-500/20 text-emerald-400",
    purple: "from-purple-600/20 to-purple-800/5 border-purple-500/20 text-purple-400",
    amber:  "from-amber-600/20 to-amber-800/5 border-amber-500/20 text-amber-400",
    pink:   "from-pink-600/20 to-pink-800/5 border-pink-500/20 text-pink-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 shadow-lg relative overflow-hidden group`}>
      <div className="absolute -right-4 -top-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity bg-white w-24 h-24 rounded-full"></div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-3xl filter drop-shadow-md">{icon}</span>
        <span className="text-xs bg-black/20 px-2 py-1 rounded-full">{sub}</span>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value ?? "—"}</div>
      <div className={`text-xs font-semibold mt-1.5 uppercase ${colors[color].split(' ').pop()}`}>{label}</div>
    </div>
  );
};

export default function AdminDashboard() {
  const [summary, setSummary]   = useState(null);
  const [workload, setWorkload] = useState([]);
  const [rooms, setRooms]       = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState({ teacher: { present: 0, absent: 0 }, student: { present: 0, absent: 0 } });
  const [notices, setNotices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [noTimetable, setNoTimetable] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "", target_role: "all" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    Promise.all([
      getSummary().catch(() => ({ data: null })),
      getWorkload().catch(() => ({ data: [] })),
      getRoomUtilization().catch(() => ({ data: [] })),
      getTeachers().catch(() => ({ data: [] })),
      getAttendanceTrends().catch(() => ({ data: { teacher: { present: 0, absent: 0 }, student: { present: 0, absent: 0 } } })),
      getNotices('all').catch(() => ({ data: [] }))
    ]).then(([sRes, wRes, rRes, tRes, aRes, nRes]) => {
      setSummary(sRes.data);
      setWorkload(wRes.data || []);
      setRooms(rRes.data || []);
      setTeachers(tRes.data || []);
      setAttendance(aRes.data || { teacher: { present: 0, absent: 0 }, student: { present: 0, absent: 0 } });
      setNotices(nRes.data || []);
      if (sRes.data?.total_lectures === 0) setNoTimetable(true);
    }).finally(() => setLoading(false));
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    try {
      await createNotice(noticeForm);
      toast.success("Notice posted successfully!");
      setNoticeForm({ title: "", content: "", target_role: "all" });
      fetchData(); // refresh list
    } catch (err) {
      toast.error("Failed to post notice");
    }
  };

  const workloadChart = workload
    .slice(0, 8)
    .map((w) => ({ name: w.teacher_name.split(" ").pop(), lectures: w.lecture_count }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-indigo-500/50" />
          <div className="text-indigo-400 font-semibold uppercase tracking-widest text-xs animate-pulse">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">Command Center</h2>
          <p className="text-gray-400 text-sm mt-1">Live metrics and administration portal</p>
        </div>
      </div>

      {noTimetable && (
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/40 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-amber-900/20 backdrop-blur-sm">
          <div className="text-4xl">⚠️</div>
          <div>
            <p className="text-base font-bold text-amber-300">Master Timetable Not Generated</p>
            <p className="text-sm text-amber-500/80 mt-1">
              Navigate to the <strong>Generate AI Timetable</strong> section to initiate the constraint satisfaction engine.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <StatCard icon="👩‍🎓" label="Total Students" value={summary?.total_students ?? 0} sub="Enrolled" color="pink" />
        <StatCard icon="👩‍🏫" label="Active Teachers" value={summary?.active_teachers ?? 0} sub={`${summary?.absent_teachers ?? 0} absent`} color="green" />
        <StatCard icon="📚" label="Lectures" value={summary?.total_lectures ?? 0} sub="Scheduled" color="blue" />
        <StatCard icon="🔄" label="Substitutions" value={summary?.substitutions ?? 0} sub="Auto-assigned" color="amber" />
        <StatCard icon="🏛️" label="Classrooms/Labs" value={summary?.total_rooms ?? 0} sub={`${summary?.total_classes ?? 0} classes`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visual Analytics */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
              <span className="text-indigo-400">📊</span> Faculty Workload Distribution
            </h3>
            {workloadChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workloadChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} dx={-10} />
                  <Tooltip cursor={{ fill: '#1f2937' }} contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid #374151", borderRadius: 12, color: "#f9fafb", boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} />
                  <Bar dataKey="lectures" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {workloadChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-500 bg-gray-950/50 rounded-xl border border-dashed border-gray-800">
                Generate timetable to visualize teacher workload
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Room Utilization */}
            <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
                <span className="text-emerald-400">🏢</span> Asset Utilization
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rooms.length > 0 ? rooms.map((r) => (
                  <div key={r.room_id} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <span className="text-lg">{r.type === "lab" ? "🧪" : "👨‍🏫"}</span>
                        {r.room_name} 
                        <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">Cap: {r.capacity}</span>
                      </span>
                      <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{r.utilization_pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                          r.utilization_pct > 80 ? "bg-gradient-to-r from-red-600 to-red-400"
                          : r.utilization_pct > 50 ? "bg-gradient-to-r from-amber-600 to-amber-400"
                          : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                        }`}
                        style={{ width: `${r.utilization_pct}%` }}
                      >
                         <div className="absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-white/20 to-transparent"></div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-gray-500 py-10 text-center bg-gray-950/50 rounded-xl border border-dashed border-gray-800">No utilization data yet</div>
                )}
              </div>
            </div>

            {/* Attendance Overview (Teachers vs Students) */}
            <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
                <span className="text-blue-400">👥</span> Today's Presence
              </h3>
              
              <div className="flex-1 flex flex-col justify-center space-y-8">
                {/* Teachers */}
                <div className="relative">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400 uppercase tracking-widest font-semibold text-xs">Faculty</span>
                    <span className="text-white font-bold">{attendance.teacher.present} / {attendance.teacher.present + attendance.teacher.absent}</span>
                  </div>
                  <div className="flex h-6 rounded-lg overflow-hidden border border-gray-800">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" 
                      style={{ width: `${(attendance.teacher.present / (attendance.teacher.present + attendance.teacher.absent || 1)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-gray-950 flex-1 relative overflow-hidden" 
                    >
                      <div className="absolute inset-0 pattern-diagonal-lines opacity-20 text-gray-600"></div>
                    </div>
                  </div>
                </div>

                {/* Students */}
                <div className="relative">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400 uppercase tracking-widest font-semibold text-xs">Students</span>
                    <span className="text-white font-bold">{attendance.student.present} / {attendance.student.present + attendance.student.absent}</span>
                  </div>
                  <div className="flex h-6 rounded-lg overflow-hidden border border-gray-800">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 flex items-center justify-center text-xs font-bold text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" 
                      style={{ width: `${(attendance.student.present / (attendance.student.present + attendance.student.absent || 1)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-gray-950 flex-1 relative overflow-hidden" 
                    >
                      <div className="absolute inset-0 pattern-diagonal-lines opacity-20 text-gray-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Communications Center */}
        <div className="space-y-6">
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col h-full">
            <h3 className="text-base font-bold text-gray-200 mb-6 flex justify-between items-center">
              <span className="flex items-center gap-2">
                 <span className="text-purple-400">📢</span> Broadcast Notice
              </span>
            </h3>
            
            <form onSubmit={handlePostNotice} className="space-y-4 mb-6 pb-6 border-b border-gray-800">
              <input
                type="text"
                required
                placeholder="Notice Title"
                className="w-full bg-gray-950/80 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                value={noticeForm.title}
                onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
              />
              <textarea
                required
                rows="3"
                placeholder="Notice details..."
                className="w-full bg-gray-950/80 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                value={noticeForm.content}
                onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
              ></textarea>
              <div className="flex gap-3">
                <select
                  className="bg-gray-950/80 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 flex-1"
                  value={noticeForm.target_role}
                  onChange={e => setNoticeForm({ ...noticeForm, target_role: e.target.value })}
                >
                  <option value="all">Everyone</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="student">Students Only</option>
                </select>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                  Post
                </button>
              </div>
            </form>

            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Recent Broadcasts</h4>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {notices.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-600">No recent notices</div>
              ) : (
                notices.slice(0, 5).map(notice => (
                  <div key={notice.id} className="bg-gray-950/50 p-3.5 rounded-xl border border-gray-800/80 hover:border-purple-500/30 transition-colors">
                    <div className="flex justify-between items-start mb-1.5">
                      <h5 className="font-semibold text-gray-200 text-sm">{notice.title}</h5>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        notice.target_role === 'all' ? 'bg-blue-500/20 text-blue-400' :
                        notice.target_role === 'teacher' ? 'bg-amber-500/20 text-amber-400' : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {notice.target_role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{notice.content}</p>
                    <div className="mt-2 text-[10px] text-gray-600">{new Date(notice.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
