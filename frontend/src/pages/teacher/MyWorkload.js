import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MyWorkload() {
  const { teacherId } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) { setLoading(false); return; }
    const tid = parseInt(teacherId, 10);
    Promise.all([getTimetable({ teacher_id: tid }), getTeachers()])
      .then(([ttRes, tRes]) => {
        setEntries(ttRes.data || []);
        setTeacher(tRes.data.find((t) => t.id === tid) || null);
      })
      .catch(() => toast.error("Could not load workload data"))
      .finally(() => setLoading(false));
  }, [teacherId]);

  const dayData = DAYS.map((day) => ({
    name: day.slice(0, 3),
    lectures: entries.filter((e) => e.day === day).length,
  }));

  const uniqueSubjects = [...new Set(entries.map((e) => e.subject_name))];
  const uniqueClasses = [...new Set(entries.map((e) => e.class_name))];
  const busiestDay = DAYS.reduce((a, d) =>
    entries.filter((e) => e.day === d).length > entries.filter((e) => e.day === a).length ? d : a,
    DAYS[0]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">My Workload</h2>
        <p className="text-gray-400 text-sm">Teaching load distribution this week</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 text-center text-amber-300 text-sm">
          ⚠️ No timetable data yet. Ask admin to generate the timetable first.
        </div>
      ) : (
        <>
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Lecture Count</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }}
                  formatter={(v) => [v, "Lectures"]}
                />
                <Bar dataKey="lectures" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Lectures", value: entries.length },
              { label: "Unique Subjects", value: uniqueSubjects.length },
              { label: "Classes Taught", value: uniqueClasses.length },
              { label: "Busiest Day", value: busiestDay.slice(0, 3) },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Subjects assigned */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Assigned Subjects</h3>
        {teacher?.subjects?.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {teacher.subjects.map((s) => (
              <div key={s.id} className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl px-4 py-3">
                <div className="text-sm font-medium text-indigo-300">{s.name}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{s.type}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No subjects assigned yet</p>
        )}
      </div>
    </div>
  );
}
