import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: null,
  role: localStorage.getItem("role") || null,
  // Always parse as number so comparisons with API IDs work
  teacherId: localStorage.getItem("teacherId")
    ? parseInt(localStorage.getItem("teacherId"), 10)
    : null,

  setAuth: ({ token, role, user_id, teacher_id }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    if (teacher_id != null) {
      localStorage.setItem("teacherId", String(teacher_id));
    }
    set({
      token,
      role,
      teacherId: teacher_id != null ? parseInt(teacher_id, 10) : null,
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("teacherId");
    set({ token: null, user: null, role: null, teacherId: null });
  },

  setUser: (user) => {
    if (user?.teacher_id != null) {
      localStorage.setItem("teacherId", String(user.teacher_id));
      set({ user, teacherId: parseInt(user.teacher_id, 10) });
    } else {
      set({ user });
    }
  },
}));

export default useAuthStore;
