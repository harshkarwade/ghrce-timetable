import { useEffect, useRef, useState } from "react";
import { getTimetable, getClasses, getTimeSlots } from "../../services/api";
import toast from "react-hot-toast";
import ManualAssignmentModal from "../../components/admin/ManualAssignmentModal";

/* ───────────────────────────────────────────────────────
   RECESS_LABEL  = the time-slot label that is always RECESS
   RECESS_INDEX  = 0-based position of that slot (slot 4 from the printed timetable)
──────────────────────────────────────────────────────── */
const RECESS_LABEL = "12:30 - 01:30";
const DAYS         = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORK_DAYS    = ["Monday", "Tuesday", "Wednesday", "Thursday"]; // Friday is PROJECT

export default function MasterTimetable() {
  const [semester, setSemester]   = useState("2024-25");
  const [classes,  setClasses]    = useState([]);
  const [selected, setSelected]   = useState(null);
  const [entries,  setEntries]    = useState([]);
  const [loading,  setLoading]    = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);

  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [editingEntry,  setEditingEntry]  = useState(null);

  const printRef = useRef();

  // ── Load classes & slots ────────────────────────────────────────────────────
  useEffect(() => {
    setClassesLoading(true);
    getTimeSlots()
      .then(r => setTimeSlots(r.data || []))
      .catch(() => toast.error("Could not load time slots"));

    getClasses()
      .then((r) => {
        setClasses(r.data || []);
        if (r.data?.length) setSelected(r.data[0]);
      })
      .catch(() => toast.error("Could not load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  const loadTimetable = () => {
    if (!selected) return;
    setLoading(true);
    getTimetable({ class_id: selected.id, semester_year: semester })
      .then((r) => setEntries(r.data || []))
      .catch(() => toast.error("Could not load timetable"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadTimetable(); }, [selected, semester]);

  // ── Slot-click handlers ─────────────────────────────────────────────────────
  const handleSlotClick = (day, slot) => {
    if (slot.label === RECESS_LABEL) return;
    setSelectedSlot({ day, time_slot_id: slot.id, class_id: selected.id, semester_year: semester });
    setEditingEntry(null);
    setIsModalOpen(true);
  };
  const handleEntryEdit = (ev, entry) => {
    ev.stopPropagation();
    setSelectedSlot({ day: entry.day, time_slot_id: entry.time_slot_id, class_id: selected.id, semester_year: semester });
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  // ── Build grid ──────────────────────────────────────────────────────────────
  const grid = {};
  DAYS.forEach((d) => { grid[d] = {}; timeSlots.forEach((s) => { grid[d][s.label] = []; }); });
  entries.forEach((e) => {
    if (e.day && e.time_slot_label && grid[e.day] && grid[e.day][e.time_slot_label]) {
      grid[e.day][e.time_slot_label].push(e);
    }
  });

  // ── Print / Download PDF handler ────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const visibleDays = DAYS; // show all, but Friday will show PROJECT

  return (
    <div className="space-y-6">
      {/* ── Print-only CSS injected via style tag ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-timetable, #printable-timetable * { visibility: visible !important; }
          #printable-timetable { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          #printable-timetable table { border-collapse: collapse; width: 100%; font-size: 9pt; }
          #printable-timetable th, #printable-timetable td { border: 1px solid #000 !important; padding: 4px 5px; text-align: center; vertical-align: middle; }
          #printable-timetable th { background: #f0f0f0 !important; font-weight: bold; }
          .print-recess td { background: #fff3cd !important; font-weight: bold; }
          .print-project td { background: #d1ecf1 !important; font-weight: bold; }
          .print-header { display: block !important; text-align: center; margin-bottom: 8px; }
        }
        .print-header { display: none; }
      `}</style>

      {/* ── Screen Controls ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800 shadow-lg backdrop-blur-sm no-print">
        <div className="flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">📅</span>
            Master Timetable
          </h2>
          <p className="text-gray-400 text-sm mt-1">Class & Batch-wise weekly schedule view</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
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
          <div className="h-8 w-[1px] bg-gray-800 hidden md:block" />
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
                onChange={(e) => { const c = classes.find(c => c.id === parseInt(e.target.value)); if (c) setSelected(c); }}
              >
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            )}
          </div>

          {/* ── Download / Print button ── */}
          {entries.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg border border-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/25 active:scale-95"
            >
              <span>🖨️</span> Print / Download PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!loading && entries.length === 0 && selected && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg no-print">
          <div className="text-5xl mb-4 opacity-80 cursor-pointer hover:scale-110 transition-all" onClick={() => handleSlotClick("Monday", timeSlots[0])}>🛠️</div>
          <h3 className="text-lg font-bold text-amber-300">No Timetable Configured</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-md">
            The schedule for <span className="text-white font-semibold">{selected.name}</span> has not been generated yet.
          </p>
        </div>
      )}

      {/* ── Loading state ── */}
      {(loading || timeSlots.length === 0) && !entries.length ? (
        <div className="flex items-center justify-center h-64 bg-gray-900/20 rounded-2xl border border-gray-800 no-print">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-indigo-400 font-semibold tracking-widest animate-pulse uppercase">Matrix Initializing...</div>
          </div>
        </div>
      ) : (
        <div id="printable-timetable" ref={printRef} className="overflow-x-auto rounded-xl border border-gray-800 shadow-2xl bg-gray-900">

          {/* ── Print-only College Header ── */}
          <div className="print-header">
            <div style={{ fontSize: "14pt", fontWeight: "bold" }}>G H RAISONI COLLEGE OF ENGINEERING, NAGPUR</div>
            <div style={{ fontSize: "10pt" }}>(An Empowered Autonomous Institute affiliated to Rashtrasant Tukadoji Maharaj Nagpur University)</div>
            <div style={{ fontSize: "11pt", fontWeight: "bold", marginTop: "4px" }}>Department of Artificial Intelligence</div>
            <div style={{ fontSize: "10pt" }}>Programme: B.Tech. Artificial Intelligence (B.Tech CSE-AIML)</div>
            <div style={{ fontSize: "10pt", marginTop: "6px" }}>
              <span style={{ float: "left" }}>Session: {semester}</span>
              <span style={{ float: "right" }}>Class: {selected?.name}</span>
              <span style={{ display: "block", textAlign: "center" }}>EVEN TERM – SUMMER 2026</span>
            </div>
            <hr style={{ margin: "6px 0", clear: "both" }} />
          </div>

          {/* ── Timetable Grid ── */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-center text-gray-400 border-b border-r border-gray-800 bg-gray-950 font-bold uppercase tracking-wider w-28 min-w-[100px]">
                  Day / Time
                </th>
                {timeSlots.map((slot) => (
                  <th key={slot.id} className={`p-3 text-center border-b border-gray-800 bg-gray-950 font-bold text-[11px] min-w-[130px] ${slot.label === RECESS_LABEL ? "text-amber-400" : "text-gray-200"}`}>
                    {slot.label.replace(' - ', '\n–\n')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleDays.map((day) => {
                const isFriday = day === "Friday";
                const isSaturday = day === "Saturday";
                return (
                  <tr key={day} className={`${isFriday ? "print-project bg-cyan-950/20" : ""} ${isSaturday ? "bg-gray-900/60" : "hover:bg-gray-800/10"} transition-colors`}>
                    {/* ── Day label ── */}
                    <td className="p-3 text-gray-200 font-bold text-center bg-gray-950/60 border-b border-r border-gray-800 text-xs uppercase tracking-wider whitespace-nowrap">
                      {day}
                    </td>

                    {isFriday ? (
                      /* ── Friday: spans all time slots as PROJECT ── */
                      <td colSpan={timeSlots.length} className="p-4 text-center border-b border-gray-800">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex-1 h-[1px] bg-cyan-500/30" />
                          <span className="text-cyan-300 font-black text-base tracking-[0.3em] uppercase px-6 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            📋 PROJECT
                          </span>
                          <div className="flex-1 h-[1px] bg-cyan-500/30" />
                        </div>
                      </td>
                    ) : (
                      /* ── Regular day: render each slot ── */
                      timeSlots.map((slot) => {
                        const isRecess = slot.label === RECESS_LABEL;
                        const slotEntries = grid[day]?.[slot.label] || [];

                        if (isRecess) {
                          return (
                            <td key={slot.id} className="p-0 border-b border-gray-800 print-recess">
                              <div className="flex items-center justify-center h-full min-h-[56px] bg-amber-900/20 border-l border-amber-500/20">
                                <span className="text-amber-300 font-black text-[11px] tracking-[0.25em] uppercase">☕ RECESS</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={slot.id}
                            className="p-1.5 border-b border-gray-800 align-top min-w-[130px] cursor-pointer hover:bg-white/[0.02] transition-all group"
                            onClick={() => handleSlotClick(day, slot)}
                          >
                            <div className="flex flex-col gap-1.5 h-full min-h-[56px]">
                              {slotEntries.length > 0 ? (
                                slotEntries.map((e, idx) => {
                                  const sIdx = timeSlots.findIndex(s => s.label === slot.label);
                                  const nextSlot = timeSlots[sIdx + 1];
                                  const prevSlot = timeSlots[sIdx - 1];
                                  const isPart1 = e.subject_type === 'lab' && nextSlot && grid[day][nextSlot.label]?.find(n => n.subject_id === e.subject_id && n.batch_id === e.batch_id);
                                  const isPart2 = e.subject_type === 'lab' && prevSlot && grid[day][prevSlot.label]?.find(n => n.subject_id === e.subject_id && n.batch_id === e.batch_id);
                                  let connectClass = "";
                                  if (isPart1) connectClass = "rounded-b-none border-b-amber-500/10 !pb-0.5 mb-[-6px] z-10";
                                  if (isPart2) connectClass = "rounded-t-none border-t-amber-500/10 !pt-0.5 mt-[-6px] z-0";

                                  return (
                                    <div
                                      key={idx}
                                      onClick={(ev) => handleEntryEdit(ev, e)}
                                      className={`rounded-lg p-2 border shadow-sm relative flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] flex-1 group/entry text-[10px] ${
                                        e.subject_type === 'lab'
                                          ? 'bg-gradient-to-br from-amber-900/40 to-orange-950/20 border-amber-500/30 hover:border-amber-400/60 ' + connectClass
                                          : 'bg-gradient-to-br from-indigo-900/40 to-blue-950/20 border-indigo-500/30 hover:border-indigo-400/60'
                                      }`}
                                    >
                                      {e.batch_name && (
                                        <div className="absolute -top-1.5 -right-1 bg-gray-900 text-amber-400 border border-amber-500/50 text-[8px] font-black px-1 py-0.5 rounded shadow-lg z-10 uppercase">
                                          {e.batch_name.split(' - ').pop()}
                                        </div>
                                      )}
                                      <div className={`font-black leading-tight tracking-tight ${e.subject_type === 'lab' ? 'text-amber-200' : 'text-indigo-200'}`}>
                                        {e.subject_name}
                                      </div>
                                      <div className="text-gray-400 font-semibold truncate mt-0.5">
                                        {e.teacher_name}
                                      </div>
                                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/5">
                                        <div className="text-[8px] font-bold font-mono text-gray-500 bg-black/40 px-1 py-0.5 rounded">
                                          {e.room_name}
                                        </div>
                                        <div className="opacity-0 group-hover/entry:opacity-100 transition-opacity text-[7px] font-black text-indigo-400 uppercase rounded">Edit</div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="h-full min-h-[56px] w-full rounded-lg border border-dashed border-gray-800/30 flex items-center justify-center text-gray-800 group-hover:text-indigo-500/40 transition-all font-light text-xl">
                                  +
                                </div>
                              )}
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
      )}

      {/* ── Manual Assignment Modal ── */}
      {selectedSlot && (
        <ManualAssignmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          slotData={selectedSlot}
          entry={editingEntry}
          onSave={loadTimetable}
        />
      )}

      {/* ── Legend ── */}
      {entries.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-800 w-full flex-wrap no-print">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500/20 border border-indigo-500/50 rounded" />
            <span className="font-medium">Theory Lecture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded" />
            <span className="font-medium">Lab Practical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-900/40 border border-amber-400/40 rounded" />
            <span className="font-medium">Recess Break (12:30–01:30)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-900/30 border border-cyan-500/40 rounded" />
            <span className="font-medium">Friday — Project / Practical Day</span>
          </div>
          <div className="ml-auto text-gray-500 font-semibold bg-black/20 px-3 py-1 rounded-full border border-gray-700">
            {entries.length} Total Sessions
          </div>
        </div>
      )}
    </div>
  );
}
