import { useEffect, useState } from "react";
import { getTimetable, getClasses } from "../../services/api";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00",
];

export default function MasterTimetable() {
  const [semester, setSemester] = useState("2024-25");
  const [classes, setClasses]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);

  // Load classes once
  useEffect(() => {
    getClasses()
      .then((r) => {
        setClasses(r.data || []);
        if (r.data?.length) setSelected(r.data[0]);
      })
      .catch(() => toast.error("Could not load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  // Load entries when selected class or semester changes
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getTimetable({ class_id: selected.id, semester_year: semester })
      .then((r) => setEntries(r.data || []))
      .catch(() => toast.error("Could not load timetable"))
      .finally(() => setLoading(false));
  }, [selected, semester]);

  // Build grid (Array to support multiple batches concurrent)
  const grid = {};
  DAYS.forEach((d) => { grid[d] = {}; SLOTS.forEach((s) => { grid[d][s] = []; }); });
  entries.forEach((e) => {
    if (e.day && e.time_slot_label && grid[e.day]) {
      grid[e.day][e.time_slot_label].push(e);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800 shadow-lg backdrop-blur-sm">
        <div className="flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">📅</span> 
            Master Timetable
          </h2>
          <p className="text-gray-400 text-sm mt-1">Class & Batch-wise weekly schedule view</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Semester Filter */}
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

          <div className="h-8 w-[1px] bg-gray-800 hidden md:block"></div>

          {/* Class selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Class:</span>
            {classesLoading ? (
              <div className="text-sm bg-gray-800/50 text-gray-400 px-4 py-2 rounded-lg animate-pulse w-48 text-center border border-gray-700/30">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="text-sm bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg">No classes found</div>
            ) : (
              <select
                title="Select Class"
                className="bg-gray-950 border border-gray-700 text-white text-xs rounded-lg focus:ring-1 focus:ring-indigo-500 block p-2 shadow-sm min-w-[180px] outline-none transition-all focus:border-indigo-500"
                value={selected?.id || ""}
                onChange={(e) => {
                  const c = classes.find(c => c.id === parseInt(e.target.value));
                  if (c) setSelected(c);
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* No timetable generated */}
      {!loading && entries.length === 0 && selected && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="text-5xl mb-4 opacity-80">🛠️</div>
          <h3 className="text-lg font-bold text-amber-300">No Timetable Configured</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-md">
            The schedule for <span className="text-white font-semibold">{selected.name}</span> has not been generated yet. Please utilize the AI Timetable Engine to create it.
          </p>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-900/20 rounded-2xl border border-gray-800">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-indigo-400 font-semibold tracking-widest animate-pulse">LOADING MATRIX...</div>
          </div>
        </div>
      )}

      {/* Timetable grid */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800 shadow-2xl bg-gray-900">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-center text-gray-400 border-b border-r border-gray-800 bg-gray-950 font-bold uppercase tracking-wider w-32 min-w-[120px]">
                  Time
                </th>
                {DAYS.map((d) => (
                  <th key={d} className="p-4 text-center text-gray-200 border-b border-gray-800 bg-gray-950 font-bold uppercase tracking-wider min-w-[200px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, si) => (
                <tr key={slot} className="hover:bg-gray-800/20 transition-colors">
                  <td className="p-4 text-gray-400 font-bold text-[11px] border-b border-r border-gray-800 text-center bg-gray-950/40 whitespace-nowrap">
                    {slot.replace(' - ', '\n')}
                  </td>
                  {DAYS.map((day) => {
                    const slotEntries = grid[day][slot];
                    return (
                      <td key={day} className="p-2 border-b border-gray-800 align-top h-full min-w-[180px]">
                        {slotEntries.length > 0 ? (
                          <div className="flex flex-col gap-2 h-full">
                            {slotEntries.map((e, idx) => (
                              <div key={idx} className={`rounded-xl p-3 border shadow-sm relative flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex-1 ${
                                e.subject_type === 'lab' 
                                  ? 'bg-gradient-to-br from-amber-900/40 to-orange-950/20 border-amber-500/30 hover:border-amber-400/60' 
                                  : 'bg-gradient-to-br from-indigo-900/40 to-blue-950/20 border-indigo-500/30 hover:border-indigo-400/60'
                              }`}>
                                {/* Batch Badge */}
                                {e.batch_name && (
                                  <div className="absolute -top-2 -right-1 bg-gray-900 text-amber-400 border border-amber-500/50 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg z-10 uppercase tracking-tighter">
                                    {e.batch_name.split(' - ').pop()}
                                  </div>
                                )}
                                
                                <div className="mb-2">
                                  <div className={`font-black text-[12px] leading-tight mb-1 tracking-tight ${e.subject_type === 'lab' ? 'text-amber-200' : 'text-indigo-200'}`}>
                                    {e.subject_name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-bold opacity-90 truncate flex items-center gap-1">
                                    <span className="opacity-50 text-[8px]">👤</span> {e.teacher_name}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-end mt-auto pt-2 border-t border-white/5">
                                  <div className="text-[9px] font-black font-mono text-gray-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                    {e.room_name}
                                  </div>
                                  {e.is_substituted && (
                                    <div className="flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" title="Substituted"></span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full min-h-[80px] w-full rounded-xl border border-dashed border-gray-800/40 bg-gray-900/10 flex items-center justify-center text-gray-700 text-xs">
                             —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-800 w-full flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded" />
            <span className="font-medium">Theory Lecture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded" />
            <span className="font-medium">Lab Practical (Batch split)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </div>
            <span className="font-medium">Substituted Session</span>
          </div>
          <div className="ml-auto text-gray-500 font-semibold bg-black/20 px-3 py-1 rounded-full border border-gray-700">
            {entries.length} Total Sessions
          </div>
        </div>
      )}
    </div>
  );
}
