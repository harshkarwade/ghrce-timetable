import { useState, useEffect } from "react";
import { generateTimetable, getDepartments } from "../../services/api";
import toast from "react-hot-toast";

export default function GenerateTimetable() {
  const [config, setConfig] = useState({
    semester_year: "2024-25",
    avoid_consecutive: true,
    balance_load: true,
    labs_afternoon: false,
    max_per_day: 3,
    target_dept_id: "", // [NEW] Added department filter
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    getDepartments().then(res => setDepartments(res.data)).catch(() => {});
  }, []);

  const toggle = (key) => setConfig((p) => ({ ...p, [key]: !p[key] }));

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await generateTimetable(config);
      setResult(data);
      toast.success(`Generated ${data.slots_generated} lecture slots!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed — ensure data is seeded");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white">AI Timetable Generator</h2>
        <p className="text-gray-400 text-sm mt-1">Configure constraints and run the CSP + Backtracking engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Scheduling Constraints</h3>
          {[
            { key: "avoid_consecutive", label: "Avoid consecutive lectures for same teacher" },
            { key: "balance_load", label: "Balance workload evenly across teachers" },
            { key: "labs_afternoon", label: "Schedule lab sessions in afternoon only" },
          ].map((c) => (
            <label key={c.key} className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => toggle(c.key)}
                className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${config[c.key] ? "bg-indigo-600" : "bg-gray-700"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${config[c.key] ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-xs text-gray-300">{c.label}</span>
            </label>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Max lectures per teacher/day: {config.max_per_day}</label>
            <input type="range" min={1} max={7} value={config.max_per_day}
              onChange={(e) => setConfig((p) => ({ ...p, max_per_day: +e.target.value }))}
              className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Target Department (Optional)</label>
            <select 
              value={config.target_dept_id} 
              onChange={(e) => setConfig(p => ({ ...p, target_dept_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Departments (Slow)</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Semester Year</label>
            <input value={config.semester_year} onChange={(e) => setConfig((p) => ({ ...p, semester_year: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Algorithm Details</h3>
          {[
            ["Primary", "Constraint Satisfaction Problem (CSP)"],
            ["Fallback", "Backtracking with Heuristics"],
            ["Optimization", "Genetic Algorithm (GA) Phase 2"],
            ["Conflict Check", "Teacher + Room + Class slots"],
            ["API Endpoint", "POST /api/timetable/generate"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-700/30 py-2 text-xs">
              <span className="text-gray-400">{k}</span>
              <span className="text-gray-200 font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleGenerate} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all">
        {loading ? (
          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running AI Engine…</>
        ) : "⚡ Generate Optimized Timetable"}
      </button>

      {result && (
        <>
          {/* ── Critical / Overload Alert ── */}
          {result.success === false && result.notice_board?.notices?.some(n => n.level === 'critical') && (
            <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-6 mb-8 animate-pulse shadow-2xl shadow-red-500/10">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Critical System Overload</h3>
                  <p className="text-red-200 text-sm font-medium">AI Generation aborted due to unresolvable resource conflicts.</p>
                </div>
              </div>
              <div className="space-y-3">
                {result.notice_board.notices.filter(n => n.level === 'critical').map((n, i) => (
                  <div key={i} className="bg-black/40 p-4 rounded-xl border border-red-500/20 text-red-100 text-xs leading-relaxed">
                    <span className="font-black uppercase mr-2 text-red-500">[{n.category}]</span>
                    {n.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Truncated Subjects Alert ── */}
          {result.notice_board?.truncated_subjects?.length > 0 && (
            <div className="bg-amber-900/40 border border-amber-500/50 rounded-2xl p-6 mb-8 shadow-2xl shadow-amber-500/10">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl">🧩</span>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Partial Match (Truncated)</h3>
                  <p className="text-amber-200 text-sm font-medium">Some subjects could not fit in the available weekly slots.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {result.notice_board.truncated_subjects.map((sub, i) => (
                  <div key={i} className="bg-black/40 p-2 rounded-lg border border-amber-500/20 text-amber-100 text-[10px] truncate" title={sub}>
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-700/30 rounded-2xl p-6 text-center shadow-lg group hover:border-indigo-500/30 transition-all">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sessions Placed</p>
              <h2 className={`text-4xl font-black ${result.success ? 'text-indigo-500' : 'text-gray-600'}`}>
                {result.slots_generated || 0}
              </h2>
            </div>
            <div className="bg-gray-900 border border-gray-700/30 rounded-2xl p-6 text-center shadow-lg group hover:border-emerald-500/30 transition-all">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Conflicts Resolved</p>
              <h2 className="text-4xl font-black text-emerald-500">{result.conflicts_resolved || 0}</h2>
            </div>
            <div className="bg-gray-900 border border-gray-700/30 rounded-2xl p-6 text-center shadow-lg group hover:border-amber-500/30 transition-all">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">AI Restarts</p>
              <h2 className="text-4xl font-black text-amber-500">{result.iterations > 0 ? Math.floor(result.iterations/1000) : 0}</h2>
            </div>
          </div>

          {/* ── Optimization Suggestions + Generation Log ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Optimization Suggestions Panel */}
            <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                🎯 Optimization Suggestions
              </p>
              {(() => {
                const notices = result.notice_board?.notices || [];
                // Filter out LOAD_AUDIT – these are engine internals, not user-actionable
                const tips = notices.filter(n => n.category !== 'LOAD_AUDIT');
                if (tips.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                      <span className="text-3xl">✅</span>
                      <p className="text-emerald-400 text-xs font-bold">Schedule is well optimized!</p>
                      <p className="text-gray-600 text-[10px]">No room saturation, class overload, or substitution risks detected.</p>
                    </div>
                  );
                }
                const categoryMeta = {
                  ROOM_SATURATION:    { icon: '🏫', tip: 'Consider adding more rooms or redistributing sessions.' },
                  CLASS_OVERLOAD:     { icon: '📚', tip: 'This class has no free slots on this day — reduce subject load.' },
                  SUBSTITUTION_RISK:  { icon: '🔄', tip: 'No free slot for a substitute — consider lighter daily load for this teacher.' },
                  CAPACITY_OVERFLOW:  { icon: '⚡', tip: 'Total subject-hours exceed available weekly slots.' },
                  LOAD_AUDIT:         { icon: '👤', tip: 'A teacher is overloaded — split their subjects across faculty.' },
                };
                const groupedByLevel = {
                  critical: tips.filter(n => n.level === 'critical'),
                  warning:  tips.filter(n => n.level === 'warning'),
                  info:     tips.filter(n => n.level === 'info'),
                };
                const renderGroup = (items, levelColor, levelDot, levelLabel) => items.length === 0 ? null : (
                  <div>
                    <div className={`text-[9px] font-black ${levelColor} uppercase tracking-widest mb-1.5 flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 ${levelDot} rounded-full inline-block`} /> {levelLabel}
                    </div>
                    <div className="space-y-1.5">
                      {items.map((n, i) => {
                        const meta = categoryMeta[n.category] || { icon: 'ℹ️', tip: '' };
                        const bgClass = levelLabel === 'Critical Issues' ? 'bg-red-900/20 border-red-500/20' : levelLabel === 'Warnings' ? 'bg-amber-900/20 border-amber-500/20' : 'bg-blue-900/20 border-blue-500/20';
                        const textClass = levelLabel === 'Critical Issues' ? 'text-red-300' : levelLabel === 'Warnings' ? 'text-amber-300' : 'text-blue-300';
                        const tipClass  = levelLabel === 'Critical Issues' ? 'text-red-500/70' : levelLabel === 'Warnings' ? 'text-amber-500/70' : 'text-blue-500/70';
                        return (
                          <div key={i} className={`border rounded-lg p-2.5 text-xs ${bgClass}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm flex-shrink-0">{meta.icon}</span>
                              <div>
                                <p className={`leading-snug ${textClass}`}>{n.message}</p>
                                {meta.tip && <p className={`text-[10px] mt-1 italic ${tipClass}`}>{meta.tip}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
                return (
                  <div className="space-y-3">
                    {renderGroup(groupedByLevel.critical, 'text-red-500',   'bg-red-500',   'Critical Issues')}
                    {renderGroup(groupedByLevel.warning,  'text-amber-500', 'bg-amber-500', 'Warnings')}
                    {renderGroup(groupedByLevel.info,     'text-blue-400',  'bg-blue-400',  'Info')}
                  </div>
                );
              })()}
            </div>

            {/* Generation Log Panel */}
            <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">📋 Generation Log</p>
              <div className="space-y-1">
                {result.logs?.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono text-green-400 opacity-80 whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
