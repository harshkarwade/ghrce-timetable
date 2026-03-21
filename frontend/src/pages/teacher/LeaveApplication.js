import { useState, useEffect } from "react";
import api from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

export default function LeaveApplication() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [formData, setFormData] = useState({ start_date: "", end_date: "", reason: "" });

  useEffect(() => {
    if (user?.teacher_id) fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/leaves?teacher_id=${user.teacher_id}`);
      setLeaves(res.data);
    } catch (err) {
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setApplying(true);
      await api.post(`/leaves?teacher_id=${user.teacher_id}`, formData);
      toast.success("Leave application submitted successfully!");
      setFormData({ start_date: "", end_date: "", reason: "" });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
             <span className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white text-2xl">🌴</span> 
             Leave Management
           </h1>
           <p className="text-[var(--text-muted)] font-medium mt-1">Apply for leave and track your application status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Application Form */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl sticky top-6">
          <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="text-indigo-500">✍️</span> New Application
          </h2>
          <form onSubmit={handleApply} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Start Date</label>
              <input
                type="date"
                required
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-[var(--text-main)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">End Date</label>
              <input
                type="date"
                required
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-[var(--text-main)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={formData.end_date}
                min={formData.start_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Reason for Leave</label>
              <textarea
                required
                rows="4"
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-2xl px-4 py-4 text-[var(--text-main)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                placeholder="State your reason clearly..."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={applying}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              {applying ? "Submitting..." : "Apply Now"}
            </button>
          </form>
        </div>

        {/* History Area */}
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                <span className="text-indigo-500">📜</span> Application History
              </h2>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full">{leaves.length} REQUESTS</span>
           </div>
          
          {loading ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-20 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Loading History...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] rounded-3xl p-16 flex flex-col items-center justify-center text-center opacity-60">
               <span className="text-5xl mb-4">🍃</span>
               <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No history found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {[...leaves].reverse().map(leave => (
                <div key={leave.id} className="group bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 hover:border-indigo-500/30 transition-all shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-[var(--bg-sidebar)] p-3 rounded-2xl border border-[var(--border-subtle)] text-center min-w-[100px]">
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase block mb-0.5 tracking-tighter">Start</span>
                        <span className="text-sm font-black text-[var(--text-main)] italic">{new Date(leave.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-indigo-500 font-black">❯</div>
                      <div className="bg-[var(--bg-sidebar)] p-3 rounded-2xl border border-[var(--border-subtle)] text-center min-w-[100px]">
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase block mb-0.5 tracking-tighter">End</span>
                        <span className="text-sm font-black text-[var(--text-main)] italic">{new Date(leave.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-auto md:ml-0">
                      <div className="text-right hidden md:block">
                         <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 italic">Status</p>
                         <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                           leave.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                           leave.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                           "bg-rose-500/10 text-rose-500 border-rose-500/20"
                         }`}>
                           {leave.status}
                         </span>
                      </div>
                      <div className="md:hidden">
                         <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                           leave.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                           leave.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                           "bg-rose-500/10 text-rose-500 border-rose-500/20"
                         }`}>
                           {leave.status}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-[var(--bg-sidebar)]/30 rounded-2xl border border-[var(--border-subtle)]">
                     <p className="text-[10px] font-black text-indigo-500 uppercase mb-2 tracking-widest italic">Reason</p>
                     <p className="text-sm font-medium text-[var(--text-main)] leading-relaxed italic">"{leave.reason}"</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    <span>Applied: {new Date(leave.created_at).toLocaleDateString()}</span>
                    <span className="opacity-40 italic">ID: #{leave.id.toString().padStart(4, '0')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
