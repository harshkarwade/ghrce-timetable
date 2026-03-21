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

  if (loading) return <div className="p-6 text-gray-400">Loading classes...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">Manage Classes & Intake</h1>
          <p className="text-gray-400 mt-1">Define class strengths (60, 120, 180). Oversized classes will be auto-sectioned by the AI Engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border border-gray-800 bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {editingId ? "✏️ Edit Class" : "➕ Add New Class"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Class Name (e.g. AI-Sem5)</label>
              <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Department</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                value={form.dept_id} onChange={e => setForm({...form, dept_id: e.target.value})}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Semester</label>
                <input type="number" min="1" max="8" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                  value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-emerald-400 text-xs mb-1 font-semibold">Intake / Strength</label>
                <select className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded p-2 text-emerald-300 focus:outline-none focus:border-emerald-500"
                  value={form.strength} onChange={e => setForm({...form, strength: parseInt(e.target.value)})}>
                  <option value={60}>60 (1 Section)</option>
                  <option value={120}>120 (2 Sections)</option>
                  <option value={180}>180 (3 Sections)</option>
                  <option value={240}>240 (4 Sections)</option>
                </select>
              </div>
            </div>
            
            <div className="pt-2 flex gap-2">
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded transition-colors">
                {editingId ? "Update Class" : "Save Class"}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({name:"", dept_id:"", semester:1, strength:60}); }} 
                        className="px-4 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 border border-gray-800 bg-gray-900/50 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3">Class Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Sem</th>
                <th className="p-3">Strength</th>
                <th className="p-3">Auto-Sections</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {classes.map(c => {
                const sections = Math.ceil((c.strength || 60) / 60);
                const dept = departments.find(d => d.id === c.dept_id);
                return (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 font-medium text-white">{c.name}</td>
                    <td className="p-3 text-gray-400">{dept?.name || "Unknown"}</td>
                    <td className="p-3">Sem {c.semester}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{c.strength || 60}</td>
                    <td className="p-3 text-blue-400">{sections}</td>
                    <td className="p-3 text-right space-x-3">
                      <button onClick={() => handleEdit(c)} className="text-gray-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 transition-colors">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">No classes found. Please create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
