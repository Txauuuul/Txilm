import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Details from "./pages/Details";
import Lists from "./pages/Lists";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Social from "./pages/Social";
import CustomLists from "./pages/CustomLists";
import Collections from "./pages/Collections";
import WhatToWatch from "./pages/WhatToWatch";
import Compare from "./pages/Compare";
import useAuthStore from "./store/useAuthStore";
import { getMe, refreshToken as apiRefresh } from "./api/api";

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);

  // Verify token on mount — try refresh if expired
  useEffect(() => {
    if (!token) return;
    getMe()
      .then((user) => setAuth(user, token))
      .catch(async () => {
        // Token expired — try to refresh
        const rt = useAuthStore.getState().refreshToken;
        if (rt) {
          try {
            const data = await apiRefresh(rt);
            setAuth(data.user, data.access_token, data.refresh_token);
          } catch {
            logout();
          }
        } else {
          logout();
        }
      });
  }, []);

  return (
    <div className="bg-cine-bg text-white min-h-screen overflow-x-hidden max-w-full">
      {isAuthenticated && <Navbar />}
      {/* main area: safe-area top on mobile, fixed-nav offset on desktop */}
      <main className={isAuthenticated ? "safe-top" : ""}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/movie/:id" element={<ProtectedRoute><Details /></ProtectedRoute>} />
          <Route path="/lists" element={<ProtectedRoute><Lists /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/custom-lists" element={<ProtectedRoute><CustomLists /></ProtectedRoute>} />
          <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
          <Route path="/what-to-watch" element={<ProtectedRoute><WhatToWatch /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
