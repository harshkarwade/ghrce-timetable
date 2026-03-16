import { useEffect, useState } from "react";
import api from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ present: 0, absent: 0, total_lectures: 0 });
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mocking summary stats for the dashboard in a real app this would be a dedicated endpoint
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const timetableRes = await api.get(`/timetable?class_id=${user.class_id}`);
      
      const filtered = timetableRes.data.filter(t => t.day === today);
      filtered.sort((a, b) => a.time_slot_label.localeCompare(b.time_slot_label));
      
      setTodayClasses(filtered);
      // Hardcode mock stats for visual presence
      setStats({ present: 45, absent: 3, total_lectures: 48 });
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-center py-20 animate-pulse">Loading dashboard...</div>;
  }

  const attendancePct = ((stats.present / (stats.total_lectures || 1)) * 100).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {user?.name?.split(" ")[0] || "Student"}! 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Here is your academic overview for today.</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
               <span className="text-2xl">🎓</span>
               <div>
                 <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Overall Attendance</div>
                 <div className="text-xl font-bold text-emerald-300">{attendancePct}%</div>
               </div>
            </div>
            {user?.enrollment_number && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                 <span className="text-2xl">🆔</span>
                 <div>
                   <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Enrollment No.</div>
                   <div className="text-sm font-bold text-indigo-300">{user.enrollment_number}</div>
                 </div>
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Quick-View */}
          {user?.class_name && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex gap-6 items-center flex-wrap">
               <div className="flex-1 min-w-[200px]">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Class</p>
                 <p className="text-white font-semibold flex items-center gap-2">
                   🏛️ {user.class_name}
                 </p>
               </div>
               {user.batch_name && (
                 <div className="flex-1 min-width-[100px]">
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Batch</p>
                   <p className="text-white font-semibold flex items-center gap-2">
                     👥 {user.batch_name}
                   </p>
                 </div>
               )}
               <div className="flex-1 min-width-[150px]">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Status</p>
                 <p className="text-emerald-400 font-semibold flex items-center gap-2 text-sm uppercase">
                   <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                   Active Student
                 </p>
               </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📅 Today's Schedule
              <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{todayClasses.length} Classes</span>
            </h2>
            
            {todayClasses.length === 0 ? (
              <div className="text-center py-12 bg-gray-950/50 rounded-xl border border-dashed border-gray-800">
                <p className="text-gray-500">No classes scheduled for today.</p>
                <p className="text-sm text-emerald-500/50 mt-2">Enjoy your day off!</p>
              </div>
            ) : (
              <div className="space-y-3 relative">
                {todayClasses.map((cls, idx) => (
                  <div key={cls.id} className="relative group">
                    <div className="flex items-stretch gap-4 bg-gray-950/50 rounded-xl p-3 border border-gray-800 hover:border-emerald-500/30 transition-all hover:bg-gray-900 shadow-sm">
                      <div className="flex flex-col items-center justify-center w-24 border-r border-gray-800 pr-4">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Time</span>
                        <span className="text-sm font-semibold text-emerald-400 mt-1 whitespace-nowrap">{cls.time_slot_label.split(' - ')[0]}</span>
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                                {cls.subject_name}
                                {cls.subject_type === 'lab' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">LAB</span>}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                                <span>👨‍🏫 {cls.teacher_name}</span>
                                <span>📍 {cls.room_name}</span>
                              </p>
                           </div>
                           {cls.is_substituted && (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Substituted</span>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
             <h2 className="text-lg font-semibold text-indigo-100 mb-4 flex items-center gap-2">📌 Latest Notices</h2>
             <div className="space-y-3">
               <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-semibold text-amber-400">Important</span>
                   <span className="text-[10px] text-gray-400">2d ago</span>
                 </div>
                 <p className="text-sm text-gray-200 leading-snug">Mid-Semester exams will commence from 25th October. Timetable will be shared soon.</p>
               </div>
               <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-semibold text-emerald-400">Event</span>
                   <span className="text-[10px] text-gray-400">5d ago</span>
                 </div>
                 <p className="text-sm text-gray-200 leading-snug">Annual Tech Symposium registrations are now open. Register at the CE department.</p>
               </div>
             </div>
             <button className="w-full mt-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-sm rounded-lg transition-colors border border-indigo-500/20">
               View All Notices
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
