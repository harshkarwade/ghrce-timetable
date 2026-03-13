import { useState, useEffect } from "react";
import api from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", 
  "12:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00"
];

export default function StudentTimetable() {
  const { user } = useAuthStore();
  const [timetableMap, setTimetableMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timetable?class_id=${user.class_id}`);
      
      const map = {};
      res.data.forEach(entry => {
        // filter out labs that belong to other batches
        if (entry.batch_id && entry.batch_id !== user.batch_id) return;

        const key = `${entry.day}-${entry.time_slot_label}`;
        map[key] = entry;
      });
      setTimetableMap(map);
    } catch (err) {
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400 p-8 text-center animate-pulse">Loading timetable...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">📅 My Weekly Timetable</h1>
      </div>

      <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-3 border-b border-r border-gray-800 bg-gray-950 font-semibold text-gray-400 text-sm text-center w-28">Time</th>
              {DAYS.map(day => (
                <th key={day} className="p-3 border-b border-gray-800 bg-gray-950 font-semibold text-gray-300 text-sm text-center min-w-[160px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, idx) => (
              <tr key={slot} className="hover:bg-gray-800/30 transition-colors">
                <td className="p-3 border-b border-r border-gray-800 text-xs text-gray-400 font-medium text-center whitespace-nowrap bg-gray-950/50">
                  {slot}
                </td>
                {DAYS.map(day => {
                  const entry = timetableMap[`${day}-${slot}`];
                  return (
                    <td key={day} className="p-2 border-b border-gray-800 text-sm">
                      {entry ? (
                        <div className={`h-full w-full p-2.5 rounded-lg border flex flex-col justify-center items-center text-center transition-all ${
                          entry.subject_type === 'lab' 
                            ? 'bg-amber-900/20 border-amber-700/30 hover:border-amber-500/50 hover:bg-amber-900/40' 
                            : 'bg-emerald-900/20 border-emerald-700/30 hover:border-emerald-500/50 hover:bg-emerald-900/40'
                        }`}>
                          <div className="font-bold text-gray-100 mb-1 leading-tight">{entry.subject_name}</div>
                          <div className="text-[10px] text-gray-400">👨‍🏫 {entry.teacher_name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium bg-black/20 px-1.5 py-0.5 rounded">📍 {entry.room_name}</div>
                          {entry.batch_name && (
                            <div className="mt-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded-full uppercase border border-amber-500/20">
                              {entry.batch_name}
                            </div>
                          )}
                          {entry.is_substituted && (
                            <div className="mt-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded-full uppercase border border-blue-500/20">
                              Substituted
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-16 w-full rounded-lg border border-dashed border-gray-800/50 bg-gray-900/20 flex flex-col justify-center items-center text-gray-600 text-xs">
                           -
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
