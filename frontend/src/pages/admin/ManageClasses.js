import { useState, useEffect } from "react";
import { getClasses, getDepartments, createClass, updateClass, deleteClass } from "../../services/api";
import toast from "react-hot-toast";

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", dept_id: "", semester: 1, strength: 60 });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clsRes, deptRes] = await Promise.all([getClasses(), getDepartments()]);
      setClasses(clsRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error) {
      toast.error("Failed to load classes or departments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dept_id) {
      toast.error("Name and Department are required");
      return;
    }
    
    try {
      if (editingId) {
        await updateClass(editingId, form);
        toast.success("Class updated successfully");
      } else {
        await createClass(form);
        toast.success("Class created successfully");
      }
      setForm({ name: "", dept_id: "", semester: 1, strength: 60 });
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save class");
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, dept_id: c.dept_id, semester: c.semester, strength: c.strength || 60 });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await deleteClass(id);
      toast.success("Class deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete class");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 tracking-tight">Manage Classes</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Define intake and branch assignments</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">AI Capacity Planning Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-4">
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-2xl sticky top-8">
            <h3 className="text-base font-bold text-gray-200 mb-6 flex items-center gap-2">
              <span className="text-emerald-400">{editingId ? "✏️" : "➕"}</span>
              {editingId ? "Modify Class Entity" : "Register New Class"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Class Identifier</label>
                <input 
                  type="text" 
                  placeholder="e.g. AI-SC-S5"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl p-3 text-sm text-white placeholder:text-gray-700 outline-none transition-all font-medium"
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Academic Department</label>
                <select 
                  className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 rounded-xl p-3 text-sm text-white outline-none transition-all cursor-pointer font-medium"
                  value={form.dept_id} 
                  onChange={e => setForm({...form, dept_id: e.target.value})}
                >
                  <option value="">Select Branch</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Semester</label>
                  <input 
                    type="number" 
                    min="1" max="8" 
                    className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 rounded-xl p-3 text-sm text-white outline-none transition-all font-medium"
                    value={form.semester} 
                    onChange={e => setForm({...form, semester: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest ml-1">Student Intake</label>
                   <select 
                    className="w-full bg-emerald-500/10 border border-emerald-500/20 focus:border-emerald-500 rounded-xl p-3 text-sm text-emerald-400 outline-none transition-all cursor-pointer font-bold"
                    value={form.strength} 
                    onChange={e => setForm({...form, strength: parseInt(e.target.value)})}
                  >
                    <option value={60}>60 (Std)</option>
                    <option value={120}>120 (Dbl)</option>
                    <option value={180}>180 (Tpl)</option>
                    <option value={240}>240 (Max)</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95"
                >
                  {editingId ? "Update Record" : "Confirm & Save"}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingId(null); setForm({name:"", dept_id:"", semester:1, strength:60}); }} 
                    className="px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-8">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Class Registry</h3>
                <span className="text-[10px] font-bold text-gray-500">{classes.length} Entities Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 bg-gray-900/40">
                  <tr>
                    <th className="px-6 py-4">Class Entity</th>
                    <th className="px-6 py-4">Academic Context</th>
                    <th className="px-6 py-4">Structure</th>
                    <th className="px-6 py-4 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {classes.map(c => {
                    const sections = Math.ceil((c.strength || 60) / 60);
                    const dept = departments.find(d => d.id === c.dept_id);
                    return (
                      <tr key={c.id} className="group hover:bg-white/5 transition-all">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-xs">
                                    {c.semester}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{c.name}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">SEM-{c.semester} Academic</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-xs font-bold text-gray-400 bg-gray-950 px-2 py-1 rounded border border-gray-800">{dept?.name || "Unassigned"}</span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                                <div className="text-xs font-black text-emerald-400/80">{c.strength || 60} Students</div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase">{sections} Optimization Units</div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(c)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all" title="Modify Record">
                                    ✏️
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all" title="Destroy Entity">
                                    🗑️
                                </button>
                            </div>
                        </td>
                      </tr>
                    );
                  })}
                  {classes.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="text-4xl opacity-20 mb-3 grayscale">🏫</div>
                          <div className="text-xs font-black text-gray-600 uppercase tracking-widest">No matching registry found</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
