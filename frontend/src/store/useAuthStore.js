import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken: refreshToken || get().refreshToken,
          isAuthenticated: true,
        }),

      updateUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch } })),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),

      getToken: () => get().token,
      getRefreshToken: () => get().refreshToken,
    }),
    {
      name: "txilms-auth",
    }
  )
);

export default useAuthStore;
