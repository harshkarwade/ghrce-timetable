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
  const handlePrint = () => { window.print(); };

  // ── Excel Export Handler (CSV) ──────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!entries.length || !timeSlots.length) return;

    const headers = ["Day / Time", ...timeSlots.map(s => s.label)];
    const rows = DAYS.map(day => {
      const row = [day];
      timeSlots.forEach(slot => {
        if (slot.label === RECESS_LABEL) {
          row.push("RECESS");
          return;
        }
        if (day === "Friday") {
          row.push("PROJECT DAY");
          return;
        }
        const cellEntries = grid[day]?.[slot.label] || [];
        const cellText = cellEntries.map(e => 
          `${e.subject_name} (${e.teacher_name})${e.batch_name ? ' [' + e.batch_name.split(' - ').pop() + ']' : ''}`
        ).join(" | ");
        row.push(cellText || "-");
      });
      return row;
    });

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Timetable_${selected?.name || 'Class'}_${semester}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel (CSV) exported successfully!");
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const visibleDays = DAYS; // show all, but Friday will show PROJECT

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Print-only CSS ── */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-timetable { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 0 !important; border: none !important; box-shadow: none !important; background: white !important; }
          .no-print { display: none !important; }
          
          #printable-timetable table { border: 2px solid #000 !important; table-layout: fixed; border-collapse: collapse; }
          #printable-timetable th, #printable-timetable td { border: 1px solid #000 !important; color: #000 !important; background: transparent !important; height: 1.5cm !important; }
          #printable-timetable th { background: #f3f4f6 !important; font-weight: 800 !important; text-transform: uppercase !important; }
          
          .entry-card { border: none !important; background: none !important; box-shadow: none !important; padding: 2px !important; }
          .entry-title { color: #000 !important; font-weight: 800 !important; font-size: 8.5pt !important; }
          .entry-sub { color: #333 !important; font-weight: 500 !important; font-size: 7.5pt !important; }
          .entry-room { background: #eee !important; color: #000 !important; font-weight: bold !important; border: 1px solid #ccc !important; }
          
          .print-recess { background: #fffcf0 !important; }
          .recess-text { color: #92400e !important; font-weight: 900 !important; letter-spacing: 0.1em !important; }
          
          .print-project { background: #f0f9ff !important; }
          .project-text { color: #0369a1 !important; font-weight: 900 !important; letter-spacing: 0.2em !important; }
        }
      `}</style>

      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Master Timetable</h1>
              <p className="text-[var(--text-muted)] font-medium">Efficient scheduling for academic excellence.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-sidebar)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Session / Year</label>
            <input
              type="text"
              className="bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-bold rounded-xl px-4 py-2.5 w-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="2024-25"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
          
          <div className="h-10 w-[1px] bg-[var(--border-subtle)]" />
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Select Class</label>
            {classesLoading ? (
              <div className="text-xs bg-[var(--bg-main)] text-[var(--text-muted)] px-4 py-2.5 rounded-xl animate-pulse w-48 border border-[var(--border-subtle)]">Loading...</div>
            ) : (
              <select
                className="bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-bold rounded-xl px-4 py-2.5 min-w-[200px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                value={selected?.id || ""}
                onChange={(e) => { const c = classes.find(c => c.id === parseInt(e.target.value)); if (c) setSelected(c); }}
              >
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            )}
          </div>

          {/* ── Download / Print buttons ── */}
          {entries.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-95"
              >
                <span>📊</span> Export Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-95"
              >
                <span>🖨️</span> Print / Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty & Loading States ── */}
      {!loading && entries.length === 0 && selected && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm no-print">
          <div className="text-6xl mb-6">🗓️</div>
          <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">No Schedule Found</h2>
          <p className="text-[var(--text-muted)] font-medium mt-2 max-w-sm">
            The timetable for <span className="text-[var(--text-main)] underline decoration-amber-500/30 decoration-2">{selected.name}</span> hasn't been generated yet for this session.
          </p>
          <button onClick={() => navigate("/admin/generate")} className="mt-8 px-8 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">Go to Generator</button>
        </div>
      )}

      {(loading || timeSlots.length === 0) && !entries.length ? (
        <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-sidebar)] rounded-3xl border border-[var(--border-subtle)] no-print">
           <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">Loading Matrix...</p>
        </div>
      ) : (
        <div id="printable-timetable" className="relative group overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl transition-all hover:shadow-2xl">
          
          {/* ── Print-only Institutional Header ── */}
          <div className="print-header hidden print:block text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-xl font-black uppercase">G H Raisoni College of Engineering, Nagpur</h1>
            <p className="text-xs font-bold italic">Department of Artificial Intelligence</p>
            <div className="flex justify-between items-end mt-4 px-2">
              <div className="text-left">
                <p className="text-[10pt] font-bold">Session: <span className="font-normal">{semester}</span></p>
                <p className="text-[10pt] font-bold">Program: <span className="font-normal">B.Tech AI-AIML</span></p>
              </div>
              <div className="bg-black text-white px-4 py-1 font-black text-sm rounded">CLASS TIMETABLE</div>
              <div className="text-right">
                <p className="text-[10pt] font-bold">Class: <span className="font-normal">{selected?.name}</span></p>
                <p className="text-[10pt] font-bold">W.E.F: <span className="font-normal">21/03/2026</span></p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 bg-[var(--bg-sidebar)] border-b border-r border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-32">
                    Day / Interval
                  </th>
                  {timeSlots.map((slot) => (
                    <th key={slot.id} className={`p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] text-center transition-colors ${slot.label === RECESS_LABEL ? "bg-amber-500/5 text-amber-600" : ""}`}>
                      <div className="text-[11px] font-extrabold tracking-tight whitespace-pre-line leading-tight">
                        {slot.label.replace(' - ', '\n–\n')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((day) => {
                  const isFriday = day === "Friday";
                  return (
                    <tr key={day} className={`group/row transition-colors ${isFriday ? "bg-indigo-50/30 dark:bg-indigo-500/5" : "hover:bg-[var(--bg-sidebar)]/50"}`}>
                      <td className="p-4 bg-[var(--bg-sidebar)] border-b border-r border-[var(--border-subtle)] text-center">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">{day}</span>
                      </td>

                      {isFriday ? (
                        <td colSpan={timeSlots.length} className="p-6 text-center border-b border-[var(--border-subtle)] print-project">
                          <div className="flex items-center justify-center gap-6">
                            <div className="h-[1px] flex-1 bg-indigo-500/20" />
                            <span className="px-10 py-3 bg-indigo-600/10 border-2 border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 font-black text-sm tracking-[0.4em] uppercase project-text">
                              🚀 Project Day
                            </span>
                            <div className="h-[1px] flex-1 bg-indigo-500/20" />
                          </div>
                        </td>
                      ) : (
                        timeSlots.map((slot) => {
                          const isRecess = slot.label === RECESS_LABEL;
                          const slotEntries = grid[day]?.[slot.label] || [];

                          if (isRecess) {
                            return (
                              <td key={slot.id} className="p-0 border-b border-[var(--border-subtle)] print-recess">
                                <div className="flex items-center justify-center h-full min-h-[80px] bg-amber-500/5 border-x border-amber-500/10">
                                  <span className="text-[10px] font-black text-amber-600/60 uppercase tracking-[0.2em] transform -rotate-0 md:-rotate-90 recess-text">RECESS</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={slot.id}
                              className="p-1.5 border-b border-[var(--border-subtle)] align-top min-w-[150px] transition-all"
                              onClick={() => handleSlotClick(day, slot)}
                            >
                              <div className="flex flex-col gap-2 h-full min-h-[80px]">
                                {slotEntries.length > 0 ? (
                                  slotEntries.map((e, idx) => {
                                    const isLab = e.subject_type === 'lab';
                                    return (
                                      <div
                                        key={idx}
                                        onClick={(ev) => handleEntryEdit(ev, e)}
                                        className={`entry-card rounded-2xl p-3 border shadow-sm relative flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] hover:shadow-lg flex-1 group/entry ${
                                          isLab
                                            ? 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50'
                                            : 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50'
                                        }`}
                                      >
                                        {e.batch_name && (
                                          <div className="absolute top-2 right-2 bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-subtle)] text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 uppercase tracking-tighter">
                                            {e.batch_name.split(' - ').pop()}
                                          </div>
                                        )}
                                        <div className={`entry-title text-[11px] font-black leading-none mb-1 ${isLab ? 'text-amber-700 dark:text-amber-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                                          {e.subject_name}
                                        </div>
                                        <div className="entry-sub text-[10px] text-[var(--text-muted)] font-bold truncate">
                                          {e.teacher_name}
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                          <div className="entry-room text-[9px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">
                                            {e.room_name}
                                          </div>
                                          <span className="opacity-0 group-hover/entry:opacity-100 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-tighter transition-opacity">Edit</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full min-h-[80px] w-full rounded-2xl border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center text-[var(--border-subtle)] hover:text-indigo-500/50 hover:bg-indigo-500/5 transition-all text-2xl font-light no-print">
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
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-6 bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm flex-wrap no-print">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-indigo-500/20 border-2 border-indigo-500/30" />
          <span className="text-xs font-bold text-[var(--text-main)]">Theory Lecture</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-amber-500/20 border-2 border-amber-500/30" />
          <span className="text-xs font-bold text-[var(--text-main)]">Lab Practical</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-amber-500/5 border-2 border-amber-500/10" />
          <span className="text-xs font-bold text-[var(--text-main)]">Recess Break</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-indigo-500/5 border-2 border-indigo-500/10" />
          <span className="text-xs font-bold text-[var(--text-main)]">Project Day</span>
        </div>
        <div className="ml-auto text-xs font-black text-[var(--text-muted)] bg-[var(--bg-sidebar)] px-4 py-2 rounded-xl border border-[var(--border-subtle)]">
          {entries.length} SESSIONS ACTIVE
        </div>
      </div>

      {selectedSlot && (
        <ManualAssignmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          slotData={selectedSlot}
          entry={editingEntry}
          onSave={loadTimetable}
        />
      )}
    </div>
  );
}
