import { useEffect, useState } from "react";
import { getTimetable } from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = [
  "09:30 - 10:30", "10:30 - 11:30", "11:30 - 12:30", "12:30 - 01:30",
  "01:30 - 02:30", "02:30 - 03:30", "03:30 - 04:30", "04:30 - 05:30"
];
const RECESS_LABEL = "12:30 - 01:30";

export default function MyTimetable() {
  const { teacherId } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) { setLoading(false); return; }
    getTimetable({ teacher_id: parseInt(teacherId, 10) })
      .then((r) => setEntries(r.data || []))
      .catch(() => toast.error("Could not load timetable"))
      .finally(() => setLoading(false));
  }, [teacherId]);

  // Build grid: day → slot label → array of entries
  const grid = {};
  DAYS.forEach((d) => { grid[d] = {}; SLOTS.forEach((s) => { grid[d][s] = []; }); });
  entries.forEach((e) => {
    if (e.day && e.time_slot_label && grid[e.day]) {
      grid[e.day][e.time_slot_label].push(e);
    }
  });

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-my-timetable, #printable-my-timetable * { visibility: visible !important; }
          #printable-my-timetable { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          #printable-my-timetable table { border-collapse: collapse; width: 100%; font-size: 9pt; }
          #printable-my-timetable th, #printable-my-timetable td { border: 1px solid #000 !important; padding: 4px 5px; text-align: center; vertical-align: middle; }
          #printable-my-timetable th { background: #f0f0f0 !important; font-weight: bold; }
          .print-header { display: block !important; text-align: center; margin-bottom: 8px; }
        }
        .print-header { display: none; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📅</span> My Weekly Timetable
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {entries.length > 0 ? `${entries.length} scheduled sessions this week` : "Viewing personal schedule"}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg border border-indigo-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span>🖨️</span> Print / Download PDF
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-gray-900/20 rounded-2xl border border-gray-800 no-print">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-indigo-400 font-semibold tracking-widest animate-pulse">LOADING SCHEDULE...</div>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg no-print">
          <div className="text-5xl mb-4 opacity-80">🍃</div>
          <h3 className="text-lg font-bold text-amber-300">Freestyle Mode</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-md">
            You do not have any lectures scheduled yet. Once the master timetable is generated, your schedule will appear here.
          </p>
        </div>
      ) : (
        <div id="printable-my-timetable" className="overflow-x-auto rounded-xl border border-gray-800 shadow-2xl bg-gray-900">
          {/* Print-only header */}
          <div className="print-header">
            <div style={{ fontSize: "14pt", fontWeight: "bold" }}>G H RAISONI COLLEGE OF ENGINEERING, NAGPUR</div>
            <div style={{ fontSize: "10pt" }}>Department of Artificial Intelligence &nbsp;|&nbsp; Faculty Personal Timetable</div>
            <hr style={{ margin: "6px 0" }} />
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-center text-gray-400 border-b border-r border-gray-800 bg-gray-950 font-bold uppercase tracking-wider w-32 min-w-[120px]">
                  Day / Time
                </th>
                {SLOTS.map((slot) => (
                  <th key={slot} className={`p-4 text-center border-b border-gray-800 bg-gray-950 font-bold text-[11px] min-w-[130px] ${slot === RECESS_LABEL ? "text-amber-400" : "text-gray-200"}`}>
                    {slot.replace(' - ', '\n–\n')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const isFriday = day === "Friday";
                return (
                  <tr key={day} className={`${isFriday ? "bg-cyan-950/20" : "hover:bg-gray-800/20"} transition-colors`}>
                    <td className="p-4 text-gray-200 font-bold text-center bg-gray-950/60 border-b border-r border-gray-800 text-xs uppercase tracking-wider whitespace-nowrap">
                      {day}
                    </td>

                    {isFriday ? (
                      <td colSpan={SLOTS.length} className="p-4 text-center border-b border-gray-800">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex-1 h-[1px] bg-cyan-500/30" />
                          <span className="text-cyan-300 font-black text-base tracking-[0.3em] uppercase px-6 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            📋 PROJECT
                          </span>
                          <div className="flex-1 h-[1px] bg-cyan-500/30" />
                        </div>
                      </td>
                    ) : (
                      SLOTS.map((slot) => {
                        const isRecess = slot === RECESS_LABEL;
                        const slotEntries = grid[day]?.[slot] || [];

                        if (isRecess) {
                          return (
                            <td key={slot} className="p-0 border-b border-gray-800">
                              <div className="flex items-center justify-center h-full min-h-[56px] bg-amber-900/20 border-l border-amber-500/20">
                                <span className="text-amber-300 font-black text-[11px] tracking-[0.25em] uppercase">☕ RECESS</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={slot} className="p-2 border-b border-gray-800 align-top">
                            {slotEntries.length > 0 ? (
                              <div className={`grid gap-1.5 ${slotEntries.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} h-full`}>
                                {slotEntries.map((e, idx) => {
                                  const sIdx = SLOTS.findIndex(s => s === slot);
                                  const nextSlot = SLOTS[sIdx + 1];
                                  const prevSlot = SLOTS[sIdx - 1];
                                  const isPart1 = e.subject_type === 'lab' && nextSlot && grid[day][nextSlot]?.find(n => n.subject_id === e.subject_id && n.batch_id === e.batch_id);
                                  const isPart2 = e.subject_type === 'lab' && prevSlot && grid[day][prevSlot]?.find(n => n.subject_id === e.subject_id && n.batch_id === e.batch_id);
                                  let connectClass = "";
                                  if (isPart1) connectClass = "rounded-b-none border-b-amber-500/10 !pb-0.5 mb-[-6px] z-10";
                                  if (isPart2) connectClass = "rounded-t-none border-t-amber-500/10 !pt-0.5 mt-[-6px] z-0";

                                  return (
                                    <div key={idx} className={`rounded-xl p-2.5 border shadow-sm relative flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] min-h-[70px] ${
                                      e.subject_type === 'lab'
                                        ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/10 border-amber-500/30 hover:border-amber-400/60 ' + connectClass
                                        : 'bg-gradient-to-br from-indigo-900/30 to-purple-900/10 border-indigo-500/30 hover:border-indigo-400/60'
                                    }`}>
                                      {e.batch_name && (
                                        <div className="absolute -top-2 -right-2 bg-gray-900 text-amber-400 border border-amber-500/50 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">
                                          {e.batch_name}
                                        </div>
                                      )}
                                      <div>
                                        <div className={`font-bold text-[12px] leading-tight mb-1 ${e.subject_type === 'lab' ? 'text-amber-300' : 'text-indigo-300'}`}>
                                          {e.subject_name}
                                        </div>
                                        <div className="text-[10px] text-gray-300 font-medium truncate">{e.class_name}</div>
                                      </div>
                                      <div className="flex justify-between items-end mt-1 pt-1.5 border-t border-white/5">
                                        <div className="text-[9px] font-mono text-gray-400 bg-black/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          <span>📍</span> {e.room_name}
                                        </div>
                                        {e.is_substituted && (
                                          <div className="flex bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded items-center gap-0.5 text-[8px] uppercase font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Sub
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-full min-h-[70px] w-full rounded-xl border border-dashed border-gray-800/40 bg-gray-900/10 flex items-center justify-center text-gray-700 text-xs">—</div>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-800 w-full flex-wrap no-print">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500/20 border border-indigo-500/50 rounded" />
            <span className="font-medium">Theory Lecture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded" />
            <span className="font-medium">Lab Session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-900/30 border border-amber-400/40 rounded" />
            <span className="font-medium">Recess (12:30–01:30)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-900/30 border border-cyan-500/40 rounded" />
            <span className="font-medium">Friday — Project Day</span>
          </div>
          <div className="flex bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded items-center gap-1 text-[9px] uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Sub
          </div>
          <span className="text-gray-400 font-medium">Substituted Session</span>
        </div>
      )}
    </div>
  );
}
