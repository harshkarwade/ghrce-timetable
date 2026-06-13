import { useEffect, useState } from "react";
import { getSubjects, createSubject, updateSubject, deleteSubject, getDepartments } from "../../services/api";
import toast from "react-hot-toast";

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
      const data = { ...form, dept_id: parseInt(form.dept_id), credits: parseInt(form.credits), weekly_load: parseInt(form.weekly_load) };
      if (editingId) {
        await updateSubject(editingId, data);
        toast.success("Subject updated!");
      } else {
        await createSubject(data);
        toast.success("Subject added!");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", dept_id: "", type: "theory", credits: 3, weekly_load: 3, code: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save subject");
    }
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setForm({ 
      name: s.name, 
      dept_id: s.dept_id, 
      type: s.type || "theory", 
      credits: s.credits || 3, 
      weekly_load: s.weekly_load || 3, 
      code: s.code || "" 
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject? This might affect existing timetable entries.")) return;
    try {
      await deleteSubject(id);
      toast.success("Subject deleted");
      load();
    } catch {
      toast.error("Failed to delete subject");
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/40 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-2xl border border-indigo-500/20">📚</div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Curriculum Registry</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{subjects.length} Subjects Catalogned</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search catalog..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white text-[11px] font-bold rounded-xl px-4 py-2.5 w-64 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-700"
            />
            <span className="absolute right-3 top-2.5 opacity-20 group-hover:opacity-40 transition-opacity">🔍</span>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            + New Subject
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-700 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             {editingId ? "Entity Modification Mode" : "Catalog Entry Initiation"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Subject Nomenclature *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Advanced AI Algorithms"
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Branch Association *</label>
              <select required value={form.dept_id} onChange={e => setForm({ ...form, dept_id: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all cursor-pointer">
                <option value="">Select Department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Instruction Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all cursor-pointer">
                <option value="theory">Theory Lecture</option>
                <option value="lab">Practical / Lab</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Index Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. CS-501"
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Credit Weightage</label>
              <input type="number" min={1} max={6} value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-1">Weekly Instructional Hours</label>
              <input type="number" min={1} max={8} value={form.weekly_load} onChange={e => setForm({ ...form, weekly_load: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>
          <div className="flex gap-4 mt-10">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-10 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              {editingId ? "Update Registry" : "Commit to Library"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-500 hover:text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl border border-gray-800 hover:bg-gray-800 transition-all">
              Abort
            </button>
          </div>
        </form>
      )}

      {/* Subjects List Grouped by Dept */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => <div key={i} className="h-32 bg-gray-900/40 rounded-[28px] animate-pulse border border-gray-800/50" />)}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.values(grouped).map(({ dept, subjects: deptSubjects }) =>
            deptSubjects.length > 0 && (
              <div key={dept.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-5">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400/80">{dept.name}</h3>
                   <div className="flex-1 h-[1px] bg-gradient-to-r from-indigo-500/20 to-transparent" />
                   <span className="text-[9px] font-bold text-gray-600 uppercase">{deptSubjects.length} Courses</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deptSubjects.map(s => (
                    <div key={s.id} className="bg-gray-900/40 border border-gray-800/80 hover:border-indigo-500/30 rounded-[28px] p-6 flex items-start gap-4 transition-all hover:bg-indigo-500/[0.02] group shadow-sm hover:shadow-indigo-500/5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110 ${
                        s.type === 'lab' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500'
                      }`}>
                        {s.type === 'lab' ? '🧪' : '📖'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <div className="font-black text-white text-sm truncate leading-tight group-hover:text-indigo-200 transition-colors uppercase tracking-tight">{s.name}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.code ? (
                             <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md font-black border border-indigo-500/20 tracking-tighter uppercase">{s.code}</span>
                          ) : (
                             <span className="text-[9px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md font-bold italic tracking-tighter">NO-CODE</span>
                          )}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${
                            s.type === 'lab' ? 'border-amber-500/20 text-amber-400/80 bg-amber-500/5' : 'border-indigo-500/20 text-indigo-400/80 bg-indigo-500/5'
                          }`}>{s.type}</span>
                          <div className="text-[9px] font-bold text-gray-600 uppercase ml-auto">Load {s.weekly_load || 3}H</div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                           <button onClick={() => handleEdit(s)} className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl transition-all font-bold">Edit</button>
                           <button onClick={() => handleDelete(s.id)} className="text-[10px] bg-red-500/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-xl transition-all font-bold">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
