import { create } from "zustand";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: null,
  role: localStorage.getItem("role") || null,
  // Always parse as number so comparisons with API IDs work
  teacherId: localStorage.getItem("teacherId")
    ? parseInt(localStorage.getItem("teacherId"), 10)
    : null,
  studentId: localStorage.getItem("studentId")
    ? parseInt(localStorage.getItem("studentId"), 10)
    : null,

  setAuth: ({ token, role, user_id, teacher_id, student_id }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    if (teacher_id != null) {
      localStorage.setItem("teacherId", String(teacher_id));
    }
    if (student_id != null) {
      localStorage.setItem("studentId", String(student_id));
    }
    set({
      token,
      role,
      teacherId: teacher_id != null ? parseInt(teacher_id, 10) : null,
      studentId: student_id != null ? parseInt(student_id, 10) : null,
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("teacherId");
    localStorage.removeItem("studentId");
    set({ token: null, user: null, role: null, teacherId: null, studentId: null });
  },

  setUser: (user) => {
    if (user?.teacher_id != null) {
      localStorage.setItem("teacherId", String(user.teacher_id));
      set({ user, teacherId: parseInt(user.teacher_id, 10) });
    } else if (user?.student_id != null) {
      localStorage.setItem("studentId", String(user.student_id));
      set({ user, studentId: parseInt(user.student_id, 10) });
    } else {
      set({ user });
    }
  },
}));

export default useAuthStore;
