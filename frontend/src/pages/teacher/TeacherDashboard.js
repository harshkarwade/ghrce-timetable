import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

export default function TeacherDashboard() {
  const { teacherId, user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    const tid = parseInt(teacherId, 10);

    Promise.all([
      getTimetable({ teacher_id: tid }),
      getTeachers(),
    ])
      .then(([ttRes, tRes]) => {
        setEntries(ttRes.data || []);
        const found = tRes.data.find((x) => x.id === tid);
        setTeacher(found || null);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        toast.error("Could not load dashboard data");
      })
      .finally(() => setLoading(false));
  }, [teacherId]);

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayEntries = entries.filter((e) => e.day === todayName);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-semibold">Teacher ID not found.</p>
        <p className="text-sm mt-1">Please logout and login again with your teacher account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-700 flex items-center justify-center text-xl font-bold text-white">
            {teacher?.avatar || "?"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Welcome, {teacher?.name || user?.teacher_name || "Teacher"}
            </h2>
            <p className="text-gray-400 text-sm">{teacher?.department?.name || ""}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${
                teacher?.status === "present"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border-red-500/30"
              }`}
            >
              {teacher?.status || "present"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: "📖", label: "Today's Lectures", value: todayEntries.length, sub: todayName },
          { icon: "📅", label: "This Week", value: entries.length, sub: "Total lectures" },
          { icon: "📚", label: "Subjects", value: teacher?.subjects?.length || 0, sub: "Assigned" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-gray-500">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Timetable not generated notice */}
      {entries.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
          ⚠️ No timetable data yet. Ask admin to generate the timetable from the Admin portal.
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-300">
            Today's Schedule ({todayName})
          </h3>
        </div>
        {todayEntries.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            No lectures scheduled for today
          </div>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {todayEntries
              .sort((a, b) => (a.time_slot_id || 0) - (b.time_slot_id || 0))
              .map((e, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="text-xs font-mono text-gray-400 w-32 flex-shrink-0">
                    {e.time_slot_label}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-200">{e.subject_name}</div>
                    <div className="text-xs text-gray-500">
                      {e.class_name} • {e.room_name}
                    </div>
                  </div>
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {e.subject_type || "theory"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Subjects assigned */}
      {teacher?.subjects?.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">My Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {teacher.subjects.map((s) => (
              <span
                key={s.id}
                className="text-xs bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
