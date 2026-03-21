import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login } from "../services/api";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await login(email, password);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);

      setAuth({
        token: data.access_token,
        role: data.role,
        user_id: data.user_id,
        teacher_id: data.teacher_id,
        student_id: data.student_id
      });

      toast.success(`Welcome! Logged in as ${data.role}`);
      
      if (data.role === "admin") navigate("/admin");
      else navigate("/teacher");

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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 mb-6 group transition-all hover:scale-105">
            <span className="text-4xl group-hover:rotate-12 transition-transform">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GH Raisoni College</h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">AI Master Timetable System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-700/50 rounded-3xl p-8 space-y-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email" 
              placeholder="name@ghrce.edu"
              required
              className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-600" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Secret Password</label>
            <input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              type="password" 
              placeholder="••••••••"
              required
              className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-600" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-gray-700 disabled:to-gray-800 text-white py-4 rounded-2xl font-bold text-sm transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-600/20 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </span>
            ) : "Sign In to Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
