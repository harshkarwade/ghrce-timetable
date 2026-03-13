// TeacherTimetables.js
import { useEffect, useState } from "react";
import { getTimetable, getTeachers } from "../../services/api";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const SLOTS = ["08:00 - 09:00","09:00 - 10:00","10:00 - 11:00","11:00 - 12:00","12:00 - 01:00","01:00 - 02:00","02:00 - 03:00","03:00 - 04:00"];

export default function TeacherTimetables() {
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    getTeachers().then(r => { setTeachers(r.data); if (r.data.length) setSelected(r.data[0]); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    getTimetable({ teacher_id: selected.id }).then(r => setEntries(r.data)).catch(() => {});
  }, [selected]);

  const grid = {};
  DAYS.forEach(d => { grid[d] = {}; SLOTS.forEach(s => { grid[d][s] = null; }); });
  entries.forEach(e => { if (grid[e.day] && e.time_slot_label) grid[e.day][e.time_slot_label] = e; });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Teacher Timetables</h2>
      <div className="flex flex-wrap gap-2">
        {teachers.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${selected?.id === t.id ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}>
            {t.avatar} {t.name.split(" ").slice(-1)[0]}
            {t.status === "absent" && <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
          </button>
        ))}
      </div>
      {selected && (
        <div className="overflow-x-auto rounded-xl border border-gray-700/50">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="p-3 text-left text-gray-400 border-b border-gray-700 w-28">Time</th>
                {DAYS.map(d => <th key={d} className="p-3 text-center text-gray-300 border-b border-gray-700 min-w-[130px]">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, si) => (
                <tr key={slot} className={si % 2 === 0 ? "bg-gray-900/30" : "bg-gray-800/20"}>
                  <td className="p-2 text-gray-400 font-mono text-[10px] border-r border-gray-700/50">{slot}</td>
                  {DAYS.map(day => {
                    const e = grid[day][slot];
                    return (
                      <td key={day} className="p-1.5 border border-gray-700/20">
                        {e ? (
                          <div className="bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 rounded-lg p-2 min-h-[56px]">
                            <div className="font-semibold text-[11px]">{e.subject_name}</div>
                            <div className="text-[10px] opacity-60 mt-0.5">{e.class_name}</div>
                            <div className="text-[10px] opacity-50">{e.room_name}</div>
                          </div>
                        ) : <div className="h-[56px]" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
