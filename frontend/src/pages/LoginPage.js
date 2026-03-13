import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login } from "../services/api";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@ghrce.edu");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const DEMO = {
    admin: { email: "admin@ghrce.edu", password: "admin123" },
    teacher: { email: "priya@ghrce.edu", password: "teacher123" },
  };

  const handleRoleSwitch = (r) => {
    setRole(r);
    setEmail(DEMO[r].email);
    setPassword(DEMO[r].password);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data } = await login(email, password);

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);

    setAuth({
      token: data.access_token,
      role: data.role
    });

    toast.success(`Welcome! Logged in as ${data.role}`);
    navigate(data.role === "admin" ? "/admin" : "/teacher");

  } catch (err) {
    toast.error(err.response?.data?.detail || "Login failed");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), #030712" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-white">GH Raisoni College</h1>
          <p className="text-gray-400 text-sm mt-1">AI Master Timetable System</p>
        </div>

        <div className="flex bg-gray-800/60 rounded-xl p-1 mb-6">
          {["admin", "teacher"].map((r) => (
            <button key={r} onClick={() => handleRoleSwitch(r)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${role === r ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-300"}`}>
              {r === "admin" ? "🔑 Admin" : "👤 Teacher"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white py-3 rounded-xl font-semibold text-sm transition-all">
            {loading ? "Signing in…" : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div className="mt-4 bg-gray-900/40 border border-gray-700/30 rounded-xl p-4 text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300 mb-2">Demo Credentials</p>
          <p>Admin: admin@ghrce.edu / admin123</p>
          <p>Teacher: priya@ghrce.edu / teacher123</p>
        </div>
      </div>
    </div>
  );
}
