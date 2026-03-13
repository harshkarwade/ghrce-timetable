import { useEffect, useState } from "react";
import { getTeachers, markAttendance, reschedule } from "../../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AttendanceReschedule() {
  const [teachers, setTeachers] = useState([]);
  const [log, setLog] = useState([]);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { getTeachers().then(r => setTeachers(r.data)).catch(() => {}); }, []);

  const handleMark = async (id, status) => {
    try {
      await markAttendance(id, today, status);
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      toast.success(`Marked ${status}`);
    } catch { toast.error("Failed to mark attendance"); }
  };

  const handleReschedule = async () => {
    try {
      const { data } = await reschedule(today);
      setLog(data.changes || []);
      toast.success(`Rescheduled ${data.total_rescheduled} lectures`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reschedule failed");
    }
  };

  const absentCount = teachers.filter(t => t.status === "absent").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white">Attendance & Auto-Reschedule</h2>
        <p className="text-gray-400 text-sm mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700/50 flex justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Mark Attendance</h3>
          <span className="text-xs text-gray-500">{teachers.length - absentCount}/{teachers.length} Present</span>
        </div>
        <div className="divide-y divide-gray-700/30">
          {teachers.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{t.avatar || "?"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-200 font-medium">{t.name}</div>
                <div className="text-xs text-gray-500">{t.department?.name}</div>
              </div>
              <div className="flex gap-2">
                {["present", "absent"].map(s => (
                  <button key={s} onClick={() => handleMark(t.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.status === s
                      ? s === "present" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
                    {s === "present" ? "✓ Present" : "✗ Absent"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {absentCount > 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-amber-300 text-sm">{absentCount} Teacher{absentCount > 1 ? "s" : ""} Absent</div>
              <div className="text-xs text-gray-400">{teachers.filter(t => t.status === "absent").map(t => t.name).join(", ")}</div>
            </div>
          </div>
          <button onClick={handleReschedule}
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            🔄 Auto-Reschedule Timetable
          </button>
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-300">Reschedule Log</h3>
          </div>
          <div className="divide-y divide-gray-700/30">
            {log.map((l, i) => (
              <div key={i} className={`px-5 py-3 text-xs ${l.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {l.status === "success"
                  ? `✓ ${l.subject_name} (${l.class_name} • ${l.day} ${l.slot_label}) → ${l.to_teacher} (was ${l.from_teacher})`
                  : `✗ ${l.subject_name} — No substitute found`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
