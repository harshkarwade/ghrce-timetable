import { useEffect, useState } from "react";
import { getSubjects, createSubject, getDepartments } from "../../services/api";
import toast from "react-hot-toast";

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dept_id: "", type: "theory", credits: 3, weekly_load: 3, code: "" });

  const load = () => {
    setLoading(true);
    Promise.all([getSubjects(), getDepartments()])
      .then(([sRes, dRes]) => {
        setSubjects(sRes.data);
        setDepartments(dRes.data);
      })
      .catch(() => toast.error("Failed to load subjects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSubject({ ...form, dept_id: parseInt(form.dept_id), credits: parseInt(form.credits), weekly_load: parseInt(form.weekly_load) });
      toast.success("Subject added!");
      setShowForm(false);
      setForm({ name: "", dept_id: "", type: "theory", credits: 3, weekly_load: 3, code: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add subject");
    }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = departments.reduce((acc, d) => {
    acc[d.id] = { dept: d, subjects: filtered.filter(s => s.dept_id === d.id) };
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">📚 Manage Subjects</h2>
          <p className="text-gray-400 text-sm mt-1">{subjects.length} subjects across {departments.length} departments</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-950 border border-gray-700 text-white text-sm rounded-xl px-4 py-2 w-56 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Subject Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Data Structures"
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Dept *</label>
            <select required value={form.dept_id} onChange={e => setForm({ ...form, dept_id: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
              <option value="">Select...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Code</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. CS301"
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Credits</label>
            <input type="number" min={1} max={6} value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Weekly Hours</label>
            <input type="number" min={1} max={8} value={form.weekly_load} onChange={e => setForm({ ...form, weekly_load: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div className="col-span-2 md:col-span-3 flex gap-3 pt-2">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2 rounded-xl transition-all">
              ✓ Save Subject
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Subjects List Grouped by Dept */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <div key={i} className="h-20 bg-gray-900/40 rounded-2xl animate-pulse border border-gray-800" />)}
        </div>
      ) : (
        Object.values(grouped).map(({ dept, subjects: deptSubjects }) =>
          deptSubjects.length > 0 && (
            <div key={dept.id}>
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-indigo-500/50 inline-block" /> {dept.name} ({deptSubjects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {deptSubjects.map(s => (
                  <div key={s.id} className="bg-gray-900/50 border border-gray-800 hover:border-gray-600 rounded-xl p-4 flex items-start gap-3 transition-all group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                      s.type === 'lab' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-indigo-500/10 border border-indigo-500/20'
                    }`}>
                      {s.type === 'lab' ? '🧪' : '📖'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-sm truncate">{s.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {s.code && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">{s.code}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          s.type === 'lab' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
                        }`}>{s.type}</span>
                        <span className="text-[10px] text-gray-500">{s.weekly_load || s.credits || 3}h/wk</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}
