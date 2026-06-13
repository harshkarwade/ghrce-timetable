import { useEffect, useState } from "react";
import { getRooms, createRoom, updateRoom, deleteRoom } from "../../services/api";
import toast from "react-hot-toast";

const ROOM_TYPES = ["classroom", "lab", "seminar"];

export default function ManageRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", capacity: 60, type: "classroom", building: "", floor: "" });

  const load = () => {
    setLoading(true);
    getRooms()
      .then(r => setRooms(r.data))
      .catch(() => toast.error("Failed to load rooms"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const roomData = { ...form, capacity: parseInt(form.capacity) };
      if (editingId) {
        await updateRoom(editingId, roomData);
        toast.success("Room updated!");
      } else {
        await createRoom(roomData);
        toast.success("Room added!");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", capacity: 60, type: "classroom", building: "", floor: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save room");
    }
  };

  const handleEdit = (room) => {
    setEditingId(room.id);
    setForm({ 
      name: room.name, 
      capacity: room.capacity, 
      type: room.type, 
      building: room.building || "", 
      floor: room.floor || "" 
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room? This may affect existing timetable entries.")) return;
    try {
      await deleteRoom(id);
      toast.success("Room deleted");
      load();
    } catch (err) {
      toast.error("Failed to delete room. It might be in use.");
    }
  };

  const classrooms = rooms.filter(r => r.type !== "lab");
  const labs = rooms.filter(r => r.type === "lab");

  const RoomCard = ({ room }) => (
    <div className="bg-gray-900/50 border border-gray-800 hover:border-gray-600 rounded-xl p-5 flex items-start gap-4 transition-all group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
        room.type === "lab" ? "bg-amber-500/10 border border-amber-500/25" : "bg-teal-500/10 border border-teal-500/25"
      }`}>
        {room.type === "lab" ? "🧪" : "🏛️"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-base">{room.name}</div>
        <div className="text-xs text-gray-400 mt-0.5 capitalize">{room.type}</div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[11px] text-gray-300 flex items-center gap-1">
            <span className="text-gray-500">👥</span> {room.capacity} seats
          </span>
          {room.building && (
            <span className="text-[11px] text-gray-400">📍 {room.building}{room.floor ? `, Floor ${room.floor}` : ""}</span>
          )}
        </div>
      </div>
      <div className={`self-start flex flex-col items-end gap-2`}>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
          room.type === "lab"
            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
            : "border-teal-500/40 text-teal-400 bg-teal-500/10"
        }`}>
          {room.type === "lab" ? "Lab" : "Class"}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleEdit(room)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors" title="Edit">
            ✏️
          </button>
          <button onClick={() => handleDelete(room.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">🏢 Manage Rooms & Labs</h2>
          <p className="text-gray-400 text-sm mt-1">{classrooms.length} classrooms, {labs.length} labs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all self-start md:self-auto"
        >
          + Add Room
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Room Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Room 101"
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-teal-500">
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Capacity</label>
            <input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Building</label>
            <input value={form.building} onChange={e => setForm({ ...form, building: e.target.value })}
              placeholder="e.g. Block A"
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Floor</label>
            <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })}
              placeholder="e.g. 2"
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-teal-500" />
          </div>
          <div className="col-span-2 md:col-span-3 flex gap-3 pt-2">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2 rounded-xl transition-all">
              {editingId ? "✓ Update Room" : "✓ Save Room"}
            </button>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: "", capacity: 60, type: "classroom", building: "", floor: "" }); }} 
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 transition-all font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-900/40 rounded-2xl animate-pulse border border-gray-800" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {classrooms.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3 flex items-center gap-2">
                <span>🏛️</span> Classrooms ({classrooms.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classrooms.map(r => <RoomCard key={r.id} room={r} />)}
              </div>
            </div>
          )}
          {labs.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                <span>🧪</span> Labs ({labs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {labs.map(r => <RoomCard key={r.id} room={r} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
