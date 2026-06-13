import { useEffect, useState } from "react";
import { getTeachers, markAttendance, reschedule, getAffectedEntries, getCandidates, applySubstitution } from "../../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AttendanceReschedule() {
  const [teachers, setTeachers] = useState([]);
  const [affected, setAffected] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [log, setLog] = useState([]);
  const [loadingAffected, setLoadingAffected] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { load(); }, []);

  const load = () => {
    getTeachers().then(r => setTeachers(r.data)).catch(() => {});
    fetchAffected();
  };

  const fetchAffected = async () => {
    setLoadingAffected(true);
    try {
      const { data } = await getAffectedEntries();
      setAffected(data);
    } catch { toast.error("Failed to load affected lectures"); }
    finally { setLoadingAffected(false); }
  };

  const handleMark = async (id, status) => {
    try {
      await markAttendance(id, today, status);
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      toast.success(`Marked ${status}`);
      fetchAffected(); // Refresh affected list
    } catch { toast.error("Failed to mark attendance"); }
  };

  const handleReschedule = async () => {
    try {
      const { data } = await reschedule(today);
      setLog(data.changes || []);
      toast.success(`Auto-rescheduled ${data.total_rescheduled} lectures`);
      fetchAffected();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reschedule failed");
    }
  };

  const handleFetchCandidates = async (entry) => {
    setActiveEntry(entry);
    setCandidates([]);
    try {
      const { data } = await getCandidates(entry.day, entry.slot_id, entry.subject_id);
      setCandidates(data);
      if (data.length === 0) toast.error("No free & qualified substitutes found");
    } catch { toast.error("Error fetching candidates"); }
  };

  const handleAssign = async (subId) => {
    try {
      await applySubstitution(activeEntry.id, subId);
      toast.success("Substitution applied successfully");
      setActiveEntry(null);
      fetchAffected();
    } catch { toast.error("Failed to apply substitution"); }
  };

  const absentCount = teachers.filter(t => t.status === "absent").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white">Attendance & Intelligence</h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
           Operational Mode: Real-time
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Attendance List */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Faculty Status</h3>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">{teachers.length - absentCount}/{teachers.length} Active</span>
                </div>
                <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {teachers.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-6 py-4 group hover:bg-white/5 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-xs font-black text-indigo-200 border border-indigo-500/30 group-hover:scale-110 transition-transform">
                                {t.avatar || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-200 font-bold truncate">{t.name}</div>
                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight truncate">{t.department?.name}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => handleMark(t.id, "present")} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${t.status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>Present</button>
                                <button onClick={() => handleMark(t.id, "absent")} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${t.status === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>Absent</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Col: Affected Sessions & Reschedule */}
        <div className="lg:col-span-2 space-y-8">
            
            {absentCount > 0 ? (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 text-9xl opacity-[0.03] group-hover:rotate-12 transition-transform select-none font-black italic">!</div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-amber-500 tracking-tighter">Reschedule Intelligence Required</h3>
                            <p className="text-gray-400 text-sm mt-1">Found {affected.length} sessions affected by faculty absences today.</p>
                        </div>
                        <button onClick={handleReschedule} className="bg-amber-500 text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/20">
                            🔄 Start Auto-Optimize
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-10 text-center">
                    <div className="text-4xl mb-4 grayscale filter opacity-50">✨</div>
                    <h3 className="text-lg font-bold text-emerald-500 tracking-tight">System Status: Nominal</h3>
                    <p className="text-gray-500 text-sm mt-1">No faculty absences detected for the current session.</p>
                </div>
            )}

            {affected.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="px-8 py-5 border-b border-gray-800 bg-gray-950/40 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Immediate Attention Required</h3>
                            <p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">Sessions lacking faculty assignment</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">{affected.length} Classes Affected</span>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-800/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {affected.map(e => (
                            <div key={e.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:bg-white/[0.02] transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-lg font-black text-white leading-tight">{e.subject_name}</span>
                                        <div className="flex gap-1">
                                            <span className="text-[9px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-black uppercase border border-gray-700">{e.class_name}</span>
                                            {e.slot_label.includes("Lab") && <span className="text-[9px] bg-amber-500/10 px-2 py-0.5 rounded text-amber-500 font-black border border-amber-500/20 uppercase">Lab</span>}
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-500 flex items-center gap-2">
                                        <span className="bg-indigo-500/10 text-indigo-400 px-1.5 rounded">{e.slot_label}</span>
                                        <span className="opacity-30">|</span>
                                        <span className="text-gray-600">Primary:</span>
                                        <span className="text-red-400/80 underline decoration-red-500/20">{e.teacher_name}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleFetchCandidates(e)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 group-hover:scale-105">
                                    🔍 Find Manual Replacement
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {log.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
                    <div className="px-8 py-5 border-b border-gray-800 bg-gray-950/40 flex justify-between items-center">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">AI Engine Change Log</h3>
                        <button onClick={() => setLog([])} className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-tighter">Clear Log</button>
                    </div>
                    <div className="divide-y divide-gray-800/50">
                        {log.map((item, i) => (
                            <div key={i} className={`px-8 py-4 flex items-center justify-between text-xs transition-colors ${item.status === 'success' ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border ${item.status === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                                        {item.status === 'success' ? '✓' : '✗'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 font-black text-gray-200 uppercase tracking-tight">
                                            {item.subject}
                                            <span className="text-[9px] text-gray-600">•</span>
                                            <span className="text-gray-500">{item.slot}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-600 mt-0.5">
                                            {item.from} → <span className={item.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>{item.to || item.reason}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {item.status === 'success' ? 'Auto-Assigned' : 'Resolution Failed'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeEntry && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-[#13162a] border border-gray-800 rounded-[32px] w-full max-w-lg shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="p-8 border-b border-gray-800 bg-gray-950/40 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-white">Select Substitute</h3>
                                <p className="text-xs font-bold text-gray-500 uppercase mt-1 tracking-widest">For {activeEntry.subject_name} • {activeEntry.class_name}</p>
                            </div>
                            <button onClick={() => setActiveEntry(null)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar space-y-3">
                            {candidates.length > 0 ? candidates.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-2xl hover:border-indigo-500/50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-indigo-500/20">
                                            {c.avatar || "?"}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{c.name}</div>
                                            <div className="text-[9px] font-black text-gray-600 uppercase">Load: {c.load}h | {c.dept}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAssign(c.id)} className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20">
                                        Assign
                                    </button>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-gray-600 text-sm font-bold">Fetching latest availability...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
