import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      updateUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch } })),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      getToken: () => get().token,
    }),
    {
      name: "txilms-auth",
    }
  )
);

export default useAuthStore;
