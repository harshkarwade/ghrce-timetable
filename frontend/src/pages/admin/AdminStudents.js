import { useEffect, useState } from "react";
import { getStudents, getClasses } from "../../services/api";
import toast from "react-hot-toast";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getStudents(),
      getClasses(),
    ])
      .then(([sRes, cRes]) => {
        setStudents(sRes.data);
        // getClasses returns timetable entries; extract unique class info
        setClasses(cRes.data || []);
      })
      .catch(() => toast.error("Failed to load student data"))
      .finally(() => setLoading(false));
  }, []);

  const fetchByClass = async (classId) => {
    setSelectedClass(classId);
    setLoading(true);
    try {
      const params = classId !== "all" ? { class_id: classId } : {};
      const res = await getStudents(params);
      setStudents(res.data);
    } catch {
      toast.error("Failed to filter students");
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.enrollment_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">👩‍🎓 Student Management</h1>
          <p className="text-sm text-gray-400 mt-1">View all enrolled students and their details</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-indigo-400">{students.length}</p>
            <p className="text-xs text-gray-400">Total Students</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="🔍  Search by name or enrollment..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-72"
        />
        <select
          value={selectedClass}
          onChange={e => fetchByClass(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 animate-pulse">Loading students...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">👩‍🎓</div>
          <p>No students found.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-800/60 text-gray-400 uppercase text-xs tracking-wide">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Enrollment No.</th>
                  <th className="px-5 py-3">Class ID</th>
                  <th className="px-5 py-3">Batch ID</th>
                  <th className="px-5 py-3">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-800/40 transition-all">
                    <td className="px-5 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono bg-gray-800 text-indigo-300 px-2 py-0.5 rounded text-xs">
                        {student.enrollment_number}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{student.class_id}</td>
                    <td className="px-5 py-3 text-gray-300">{student.batch_id ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-400">{student.user_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
