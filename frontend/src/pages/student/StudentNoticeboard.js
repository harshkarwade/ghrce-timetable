import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function StudentNoticeboard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notices?target_role=student');
      setNotices(res.data);
    } catch (err) {
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-center py-10">Loading notices...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">📌 Digital Noticeboard</h1>
      
      {notices.length === 0 ? (
        <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-10 text-center text-gray-500">
           No new notices at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <div key={notice.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/30 transition-all shadow-md">
               <div className="flex justify-between items-start mb-3">
                 <h3 className="text-lg font-bold text-indigo-300">{notice.title}</h3>
                 <span className="text-xs text-gray-500 bg-black px-2 py-1 rounded">{new Date(notice.created_at).toLocaleDateString()}</span>
               </div>
               <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{notice.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
