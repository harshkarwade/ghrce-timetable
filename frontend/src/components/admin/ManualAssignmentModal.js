import React, { useState, useEffect } from 'react';
import { getSubjects, getTeachers, getRooms, createTimetableEntry, updateTimetableEntry } from '../../services/api';
import toast from 'react-hot-toast';

export default function ManualAssignmentModal({ isOpen, onClose, slotData, entry, onSave }) {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    room_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getSubjects(), getTeachers(), getRooms()])
        .then(([s, t, r]) => {
          setSubjects(s.data);
          setTeachers(t.data);
          setRooms(r.data);
        })
        .catch(() => toast.error("Failed to load options"))
        .finally(() => setLoading(false));

      if (entry) {
        setFormData({
          subject_id: entry.subject_id,
          teacher_id: entry.teacher_id,
          room_id: entry.room_id,
        });
      } else {
        setFormData({ subject_id: '', teacher_id: '', room_id: '' });
      }
    }
  }, [isOpen, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject_id || !formData.teacher_id || !formData.room_id) {
      return toast.error("Please select all fields");
    }

    try {
      if (entry) {
        await updateTimetableEntry(entry.id, formData);
        toast.success("Entry updated!");
      } else {
        await createTimetableEntry({
          ...slotData,
          ...formData,
        });
        toast.success("Entry assigned!");
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save entry");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            {entry ? "🛠️ Edit Session" : "⚡ Manual Assignment"}
          </h3>
          <p className="text-blue-100 text-xs mt-1 font-medium italic opacity-80 uppercase tracking-wider">
            {slotData.day} • Slot {slotData.time_slot_id}
            {slotData.batch_id && ` • Batch ID: ${slotData.batch_id}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Subject Select */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Subject</label>
            <select
              title="Select Subject"
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
              value={formData.subject_id}
              onChange={(e) => setFormData({...formData, subject_id: parseInt(e.target.value)})}
            >
              <option value="">Select a Subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
              ))}
            </select>
          </div>

          {/* Teacher Select */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Teacher</label>
            <select
              title="Select Teacher"
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
              value={formData.teacher_id}
              onChange={(e) => setFormData({...formData, teacher_id: parseInt(e.target.value)})}
            >
              <option value="">Select a Teacher...</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Room Select */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Room</label>
            <select
              title="Select Room"
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
              value={formData.room_id}
              onChange={(e) => setFormData({...formData, room_id: parseInt(e.target.value)})}
            >
              <option value="">Select a Room...</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-800 text-gray-400 font-bold hover:bg-gray-800 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 px-6 py-3 rounded-xl text-white font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 text-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : (entry ? "Update" : "Assign")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
