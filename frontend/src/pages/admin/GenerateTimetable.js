import { useState } from "react";
import { generateTimetable } from "../../services/api";
import toast from "react-hot-toast";

export default function GenerateTimetable() {
  const [config, setConfig] = useState({
    semester_year: "2024-25",
    avoid_consecutive: true,
    balance_load: true,
    labs_afternoon: false,
    max_per_day: 3,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
            <input type="range" min={1} max={6} value={config.max_per_day}
              onChange={(e) => setConfig((p) => ({ ...p, max_per_day: +e.target.value }))}
              className="w-full accent-indigo-500" />
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
            ["Optimization", "Greedy Load Balancing"],
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
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Slots Generated", value: result.slots_generated, color: "emerald" },
              { label: "Iterations", value: result.iterations, color: "blue" },
              { label: "Conflicts", value: result.conflicts_detected, color: "red" },
            ].map((s) => (
              <div key={s.label} className={`bg-${s.color}-900/30 border border-${s.color}-500/30 rounded-xl p-4 text-center`}>
                <div className={`text-2xl font-bold text-${s.color}-400`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 mb-2">Generation Log</p>
            {result.logs?.map((log, i) => (
              <div key={i} className="text-[10px] font-mono text-green-400 opacity-80">{log}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
