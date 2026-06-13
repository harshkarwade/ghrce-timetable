import { useEffect, useState } from "react";
import { getTimetable, getTimeSlots } from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const RECESS_LABEL = "12:30 - 01:30";

export default function MyTimetable() {
  const { teacherId } = useAuthStore();
  const [semester, setSemester] = useState("2024-25");
  const [entries, setEntries] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getTimeSlots()
      .then(r => setTimeSlots(r.data || []))
      .catch(() => toast.error("Could not load time slots"));
  }, []);

  const loadTimetable = () => {
    if (!teacherId || !timeSlots.length) return;
    setLoading(true);
    getTimetable({ teacher_id: parseInt(teacherId, 10), semester_year: semester })
      .then((r) => setEntries(r.data || []))
      .catch(() => toast.error("Could not load timetable"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadTimetable(); }, [teacherId, semester, timeSlots]);

  // ── Build grid ──────────────────────────────────────────────────────────────
  const grid = {};
  if (timeSlots.length) {
    DAYS.forEach((d) => { grid[d] = {}; timeSlots.forEach((s) => { grid[d][s.label] = []; }); });
    entries.forEach((e) => {
      if (e.day && e.time_slot_label && grid[e.day] && grid[e.day][e.time_slot_label]) {
        grid[e.day][e.time_slot_label].push(e);
      }
    });
  }

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 animate-fade-in">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-my-timetable { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; border: none !important; background: white !important; }
          .no-print { display: none !important; }
          #printable-my-timetable table { border: 2px solid #000 !important; border-collapse: collapse; width: 100%; }
          #printable-my-timetable th, #printable-my-timetable td { border: 1px solid #000 !important; color: #000 !important; height: 1.5cm !important; }
          #printable-my-timetable th { background: #f3f4f6 !important; font-weight: 800 !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">My Timetable</h1>
              <p className="text-[var(--text-muted)] font-medium">Your personal weekly academic schedule.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[var(--bg-sidebar)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Session / Year</label>
            <input
              type="text"
              className="bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-bold rounded-xl px-4 py-2.5 w-32 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
          <button
            onClick={handlePrint}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-95 ml-2"
          >
            <span>🖨️</span> Print PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-sidebar)] rounded-3xl border border-[var(--border-subtle)] no-print">
           <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">Loading Schedule...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm no-print">
          <div className="text-6xl mb-6">🍃</div>
          <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">No Sessions Allocated</h2>
          <p className="text-[var(--text-muted)] font-medium mt-2 max-w-sm">
            You don't have any scheduled sessions for the <span className="text-[var(--text-main)] font-bold">{semester}</span> semester yet.
          </p>
        </div>
      ) : (
        <div id="printable-my-timetable" className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl">
          
          <div className="print-header hidden print:block text-center mb-8 border-b-2 border-black pb-4">
               <h1 className="text-xl font-black uppercase">G H Raisoni College of Engineering, Nagpur</h1>
               <p className="text-xs font-bold italic">Faculty Personal Timetable — Session {semester}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 bg-[var(--bg-sidebar)] border-b border-r border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-32">
                    Day / Time
                  </th>
                  {timeSlots.map((slot) => (
                    <th key={slot.id} className={`p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] text-center ${slot.label === RECESS_LABEL ? "text-amber-600" : ""}`}>
                      <div className="text-[11px] font-extrabold tracking-tight whitespace-pre-line leading-tight">
                        {slot.label.replace(' - ', '\n–\n')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const isFriday = day === "Friday";
                  return (
                    <tr key={day} className={`group/row transition-colors ${isFriday ? "bg-indigo-50/30 dark:bg-indigo-500/5" : "hover:bg-[var(--bg-sidebar)]/50"}`}>
                      <td className="p-4 bg-[var(--bg-sidebar)] border-b border-r border-[var(--border-subtle)] text-center">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">{day}</span>
                      </td>

                      {isFriday ? (
                        <td colSpan={timeSlots.length} className="p-6 text-center border-b border-[var(--border-subtle)]">
                          <span className="px-10 py-3 bg-indigo-600/5 border-2 border-indigo-500/10 rounded-2xl text-indigo-500 dark:text-indigo-400 font-black text-sm tracking-[0.4em] uppercase">
                            🚀 Project Day
                          </span>
                        </td>
                      ) : (
                        timeSlots.map((slot) => {
                          const isRecess = slot.label === RECESS_LABEL;
                          const slotEntries = grid[day]?.[slot.label] || [];

                          if (isRecess) {
                            return (
                              <td key={slot.id} className="p-0 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-center h-full min-h-[80px] bg-amber-500/5 border-x border-amber-500/10">
                                  <span className="text-[10px] font-black text-amber-600/40 uppercase tracking-[0.2em] md:-rotate-90">RECESS</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={slot.id} className="p-1.5 border-b border-[var(--border-subtle)] align-top min-w-[150px]">
                              <div className="flex flex-col gap-2 h-full min-h-[80px]">
                                {slotEntries.map((e, idx) => (
                                  <div key={idx} className={`rounded-2xl p-3 border shadow-sm flex flex-col justify-between flex-1 ${
                                    e.subject_type === 'lab'
                                      ? 'bg-amber-500/10 border-amber-500/20'
                                      : 'bg-indigo-500/10 border-indigo-500/20'
                                  }`}>
                                    {e.batch_name && (
                                      <div className="absolute top-2 right-2 bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-subtle)] text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                        {e.batch_name.split(' - ').pop()}
                                      </div>
                                    )}
                                    <div className="text-[11px] font-black leading-none mb-1 text-[var(--text-main)]">
                                      {e.subject_name}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)] font-bold truncate">
                                      {e.class_name}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                      <div className="text-[9px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">
                                        {e.room_name}
                                      </div>
                                      {e.is_substituted && <span className="text-[8px] font-bold text-rose-500 uppercase animate-pulse">SUB</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
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
        </div>
      )}
    </div>
  );
}
