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
    fetchLeaves();
  }, []);

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🌴</span> Leave Management
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl sticky top-6">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-3">Apply for Leave</h2>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                required
                className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                required
                className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                value={formData.end_date}
                min={formData.start_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Reason</label>
              <textarea
                required
                rows="4"
                className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                placeholder="Please state the reason..."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={applying}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-gray-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              {applying ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            History
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{leaves.length}</span>
          </h2>
          
          {loading ? (
            <div className="text-center py-10 text-gray-500 animate-pulse">Loading leave history...</div>
          ) : leaves.length === 0 ? (
            <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-10 text-center text-gray-500">
               No leave requests found in history.
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(leave => (
                <div key={leave.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
                        <span className="text-xs text-gray-400 block mb-0.5">From</span>
                        <span className="text-sm font-semibold text-white">{new Date(leave.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-gray-600">→</div>
                      <div className="bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
                        <span className="text-xs text-gray-400 block mb-0.5">To</span>
                        <span className="text-sm font-semibold text-white">{new Date(leave.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {leave.status === 'pending' && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Pending</span>}
                    {leave.status === 'approved' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Approved</span>}
                    {leave.status === 'rejected' && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Rejected</span>}
                  </div>
                  <div className="mt-4 text-sm text-gray-300">
                    <span className="text-gray-500 font-medium mr-2">Reason:</span>
                    {leave.reason}
                  </div>
                  <div className="mt-3 text-[10px] text-gray-600">
                    Applied on: {new Date(leave.created_at).toLocaleString()}
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
