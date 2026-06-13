import { useState, useEffect } from "react";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getDepartments, getSubjects, rebalanceWorkload } from "../../services/api";
import toast from "react-hot-toast";

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    name: "", dept_id: "", max_load: 16, admin_load: 0, 
    designation: "", specialization: "", responsibilities: "",
    email: "", password: "teacher123", subject_ids: [] 
  });
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    load();
    return () => { isMounted = false; };
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([
      getTeachers(),
      getDepartments(),
      getSubjects()
    ]).then(([tRes, dRes, sRes]) => {
      setTeachers(tRes.data);
      setDepts(dRes.data);
      setSubjects(sRes.data);
    })
    .catch(() => toast.error("Failed to load initial data"))
    .finally(() => setLoading(false));
  };

  const handleRebalance = async () => {
    if (!window.confirm("This will automatically redistribute high workloads (>16h). Continue?")) return;
    setRebalancing(true);
    try {
      const { data } = await rebalanceWorkload();
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error("Rebalance failed");
    } finally {
      setRebalancing(false);
    }
  };

  const handleCreate = async () => {
// ... existing logic ...
    if (!form.name || !form.dept_id) { toast.error("Name and department required"); return; }
    try {
      const newTeacher = await createTeacher({ ...form, dept_id: +form.dept_id });
      toast.success("Teacher created");
      setShowForm(false);
      setForm({ 
        name: "", dept_id: "", max_load: 18, admin_load: 0, 
        designation: "", specialization: "", responsibilities: "",
        email: "", password: "teacher123", subject_ids: [] 
      });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
  };

  const handleToggleStatus = async (t) => {
    const newStatus = t.status === "present" ? "absent" : "present";
    try {
      await updateTeacher(t.id, { status: newStatus });
      setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    } catch { toast.error("Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this teacher?")) return;
    try {
      await deleteTeacher(id);
      toast.success("Deleted");
      load();
    } catch { toast.error("Error"); }
  };

  const toggleSubject = (id) => {
    setForm(p => ({
      ...p,
      subject_ids: p.subject_ids.includes(id) ? p.subject_ids.filter(x => x !== id) : [...p.subject_ids, id]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Manage Teachers</h2>
          <p className="text-gray-400 text-sm">{teachers.length} registered</p>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={rebalancing}
            onClick={handleRebalance} 
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${rebalancing ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
          >
            {rebalancing ? "Rebalancing..." : "⚡ Bulk Rebalance"}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
            + Add Teacher
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-900/60 border border-indigo-500/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-indigo-300">Add New Teacher</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "name", label: "Full Name", placeholder: "Dr. First Last" },
              { key: "email", label: "Email", placeholder: "teacher@ghrce.edu" },
              { key: "password", label: "Password", placeholder: "teacher123" },
            ].map(f => (
              <div key={f.key} className={f.key === "name" ? "col-span-2" : ""}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
            {[
              { key: "designation", label: "Designation", placeholder: "e.g. Assoc. Professor" },
              { key: "specialization", label: "Specialization", placeholder: "e.g. Machine Learning" },
              { key: "responsibilities", label: "Responsibilities", placeholder: "e.g. Exam Cell, IEEE" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Department</label>
              <select value={form.dept_id} onChange={e => setForm(p => ({ ...p, dept_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                <option value="">Select…</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Max Weekly Load</label>
              <input type="number" min={1} max={40} value={form.max_load} onChange={e => setForm(p => ({ ...p, max_load: +e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Admin Load (hrs/wk)</label>
              <input type="number" min={0} max={20} value={form.admin_load} onChange={e => setForm(p => ({ ...p, admin_load: +e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-2 block">Assign Subjects</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${form.subject_ids.includes(s.id) ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-900/20 rounded-2xl border border-gray-800 animate-pulse">
           <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
           <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Loading Records...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/20 rounded-2xl border border-dashed border-gray-800">
           <p className="text-gray-500 text-sm">No teachers found. Click '+ Add Teacher' to start.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map(t => (
            <div key={t.id} className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-4 flex items-center gap-4 transition-all hover:border-indigo-500/30">
              <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold flex-shrink-0">{t.avatar || "?"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-200 flex items-center gap-2">
                  {t.name}
                  {t.designation && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 font-normal">{t.designation}</span>}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  {t.department?.name} 
                  {t.specialization && <span className="text-gray-500">• {t.specialization}</span>}
                </div>
                {t.responsibilities && <div className="text-[10px] text-amber-400/80 mt-1 italic">Responsibility: {t.responsibilities} (Admin Load: {t.admin_load}h)</div>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.subjects?.map(s => (
                    <span key={s.id} className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full">{s.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase tracking-tighter ${
                    t.load > 16 ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                    t.load > 10 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  }`}>
                    {t.load > 16 ? "Overloaded" : t.load > 10 ? "Normal" : "Underloaded"}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${t.status === "present" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
                    {t.status}
                  </span>
                </div>
                <button onClick={() => handleToggleStatus(t)} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Toggle</button>
                <button onClick={() => handleDelete(t.id)} className="text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
