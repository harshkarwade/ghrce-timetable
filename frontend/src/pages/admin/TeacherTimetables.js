// TeacherTimetables.js
import { useEffect, useState } from "react";
import { getTimetable, getTeachers, getTimeSlots } from "../../services/api";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

export default function TeacherTimetables() {
  const [semester, setSemester] = useState("2024-25");
  const [teachers, setTeachers] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTimeSlots().then(r => setTimeSlots(r.data || [])).catch(() => {});
    getTeachers().then(r => { setTeachers(r.data); if (r.data.length) setSelected(r.data[0]); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getTimetable({ teacher_id: selected.id, semester_year: semester })
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected, semester]);

  const grid = {};
  DAYS.forEach(d => { 
    grid[d] = {}; 
    timeSlots.forEach(s => { grid[d][s.label] = null; }); 
  });
  
  entries.forEach(e => { 
    if (grid[e.day] && e.time_slot_label && grid[e.day].hasOwnProperty(e.time_slot_label)) {
      grid[e.day][e.time_slot_label] = e; 
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><span>👨‍🏫</span> Teacher Timetables</h2>
          <p className="text-gray-400 text-sm mt-1">Individual faculty schedule view</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Semester:</span>
          <input 
            type="text"
            className="bg-gray-950 border border-gray-700 text-white text-xs rounded-lg p-2 w-24 focus:ring-1 focus:ring-indigo-500 outline-none transition-all focus:border-indigo-500"
            placeholder="2024-25"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1">
        {teachers.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 border ${
              selected?.id === t.id 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                : "bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200"
            }`}>
            <span className="opacity-70">{t.avatar}</span>
            {t.name.split(" ").slice(-1)[0]}
            {t.status === "absent" && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse border border-gray-900" />}
          </button>
        ))}
      </div>

      {selected && (
        <div className="overflow-x-auto rounded-xl border border-gray-800 shadow-2xl bg-gray-950/50">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="p-4 text-center text-gray-500 border-b border-r border-gray-800 bg-gray-950 font-black uppercase tracking-wider w-32">Time</th>
                {DAYS.map(d => <th key={d} className="p-4 text-center text-gray-200 border-b border-gray-800 bg-gray-950 font-black uppercase tracking-wider min-w-[160px]">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, si) => (
                <tr key={slot.id} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="p-4 text-gray-500 font-black text-[10px] border-b border-r border-gray-800 bg-gray-950/20 text-center uppercase">
                    {slot.label}
                  </td>
                  {DAYS.map(day => {
                    const e = grid[day][slot.label];
                    return (
                      <td key={day} className="p-2 border-b border-gray-800 align-top">
                        {loading ? (
                          <div className="h-14 w-full bg-gray-800/10 animate-pulse rounded-lg" />
                        ) : e ? (
                          <div className={`rounded-xl p-3 border shadow-sm transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between h-full ${
                            e.subject_type === 'lab' 
                              ? 'bg-gradient-to-br from-amber-900/40 to-orange-950/10 border-amber-500/30 text-amber-100' 
                              : 'bg-gradient-to-br from-indigo-900/40 to-blue-950/10 border-indigo-500/30 text-indigo-100'
                          }`}>
                            <div className="font-black text-[11px] leading-tight mb-1">{e.subject_shortcode || e.subject_name}</div>
                            <div className="text-[10px] font-bold opacity-70 flex items-center gap-1">
                              <span className="text-[8px]">🏫</span> {e.class_name}
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                              <span className="text-[9px] font-black font-mono opacity-50 bg-black/30 px-1.5 py-0.5 rounded">{e.room_name}</span>
                              {e.is_substituted && <span className="text-[8px] bg-rose-500 text-white px-1 rounded-sm font-bold uppercase">Sub</span>}
                            </div>
                          </div>
                        ) : <div className="h-14 border border-dashed border-gray-800/30 rounded-lg" />}
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
