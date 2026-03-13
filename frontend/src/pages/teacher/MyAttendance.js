// MyAttendance.js
import { useState } from "react";
import { markAttendance } from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";

export function MyAttendance() {
  const { teacherId, user } = useAuthStore();
  const [status, setStatus] = useState("present");
  const today = format(new Date(), "yyyy-MM-dd");

  const handle = async (s) => {
    try {
      await markAttendance(+teacherId, today, s);
      setStatus(s);
      toast.success(`Marked as ${s}`);
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-xl font-bold text-white">My Attendance</h2>
        <p className="text-gray-400 text-sm">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-bold text-white mb-1">Mark Today's Attendance</h3>
        <p className="text-gray-400 text-sm mb-6">{today}</p>
        <div className="flex gap-4 justify-center">
          {["present", "absent"].map(s => (
            <button key={s} onClick={() => handle(s)}
              className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all ${status === s
                ? s === "present" ? "bg-emerald-600 text-white shadow-lg" : "bg-red-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
              {s === "present" ? "✓ Present" : "✗ Absent"}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <span className={`text-xs px-3 py-1 rounded-full border ${status === "present" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
            Status: {status}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MyAttendance;
