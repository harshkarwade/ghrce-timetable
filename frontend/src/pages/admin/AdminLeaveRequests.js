import { useEffect, useState } from "react";
import { getLeaveRequests, updateLeaveStatus } from "../../services/api";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  pending:  { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   label: "⏳ Pending" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "✅ Approved" },
  rejected: { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     label: "❌ Rejected" },
};

export default function AdminLeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const res = await getLeaveRequests(params);
      setLeaves(res.data);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, [filter]);

  const handleAction = async (id, status) => {
    try {
      await updateLeaveStatus(id, status);
      toast.success(`Leave request ${status}!`);
      fetchLeaves();
    } catch {
      toast.error("Failed to update leave status");
    }
  };

  const filtered = leaves;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🌴 Leave Requests</h1>
          <p className="text-sm text-gray-400 mt-1">Review and action teacher leave applications</p>
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {["pending", "approved", "rejected"].map(s => {
          const count = leaves.filter(l => l.status === s).length;
          const st = STATUS_STYLES[s];
          return (
            <div key={s} className={`${st.bg} border ${st.border} rounded-xl p-4 flex items-center gap-4`}>
              <span className={`text-3xl font-bold ${st.text}`}>{count}</span>
              <span className={`text-sm font-semibold capitalize ${st.text}`}>{s}</span>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-500 animate-pulse">Loading leave requests...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🌴</div>
            <p>No leave requests found.</p>
          </div>
        ) : (
          filtered.map(leave => {
            const st = STATUS_STYLES[leave.status] || STATUS_STYLES.pending;
            return (
              <div key={leave.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                        T{leave.teacher_id}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Teacher ID: {leave.teacher_id}</p>
                        <p className="text-gray-400 text-xs">
                          Applied: {new Date(leave.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <span className={`ml-auto ${st.bg} ${st.text} border ${st.border} px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide">From</span>
                        <p className="text-white font-medium">{new Date(leave.start_date).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide">To</span>
                        <p className="text-white font-medium">{new Date(leave.end_date).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Reason</span>
                        <p className="text-gray-300 text-sm">{leave.reason}</p>
                      </div>
                    </div>
                  </div>

                  {leave.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0 mt-1">
                      <button
                        onClick={() => handleAction(leave.id, "approved")}
                        className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/40 text-xs font-semibold transition-all"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleAction(leave.id, "rejected")}
                        className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/40 text-xs font-semibold transition-all"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
