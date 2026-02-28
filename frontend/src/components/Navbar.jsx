import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Home, Heart, Bell, User, Users, MoreHorizontal, Film, Shuffle, GitCompare, Rss, Trophy, BarChart3, Calendar } from "lucide-react";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import useAuthStore from "../store/useAuthStore";

export default function Navbar() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Inicio" },
    { to: "/lists", icon: Heart, label: "Mis Listas" },
    { to: "/social", icon: Users, label: "Social" },
    { to: "/notifications", icon: Bell, label: "Avisos", isBell: true },
    { to: "/profile", icon: User, label: "Perfil" },
  ];

  const MORE_ITEMS = [
    { to: "/feed", icon: Rss, label: "Feed" },
    { to: "/collections", icon: Film, label: "Colecciones" },
    { to: "/what-to-watch", icon: Shuffle, label: "¿Qué veo?" },
    { to: "/upcoming", icon: Calendar, label: "Estrenos" },
    { to: "/compare", icon: GitCompare, label: "Comparar" },
    { to: "/achievements", icon: Trophy, label: "Logros" },
    { to: "/wrapped", icon: BarChart3, label: "Wrapped" },
  ];

  const isMoreActive = MORE_ITEMS.some((m) => pathname === m.to);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* ── Top bar (desktop) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cine-bg/80 backdrop-blur-xl border-b border-cine-border hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-end h-14 px-4 gap-8">
          <Link to="/" className="hover:opacity-80 transition-opacity mr-auto">
            <Logo size="md" />
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.filter((n) => !n.isBell).map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to
                    ? "bg-cine-accent/10 text-cine-accent"
                    : "text-cine-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {/* Más dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setShowMore((p) => !p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isMoreActive || showMore
                    ? "bg-cine-accent/10 text-cine-accent"
                    : "text-cine-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <MoreHorizontal size={18} />
                Más
              </button>
              {showMore && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-cine-card border border-cine-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                  {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                        pathname === to
                          ? "bg-cine-accent/10 text-cine-accent"
                          : "text-cine-muted hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
          {/* Notification bell (desktop) */}
          <NotificationBell className="text-cine-muted hover:text-white transition p-2" />
          {/* User avatar */}
          {user && (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full bg-cine-card ring-1 ring-cine-border flex items-center justify-center text-xs font-bold uppercase text-cine-accent hover:ring-cine-accent transition"
              title={user.username}
            >
              {user.username?.charAt(0) || "?"}
            </Link>
          )}
        </div>
      </header>

      {/* ── Bottom tab bar (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cine-bg/90 backdrop-blur-xl border-t border-cine-border md:hidden safe-bottom">
        <div className="flex justify-around items-center h-16 pb-safe">
          {NAV_ITEMS.filter((n) => !n.isBell).map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center gap-1 py-2 px-4 ${
                pathname === to ? "text-cine-accent" : "text-cine-muted"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          {/* Más popup trigger */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setShowMore((p) => !p)}
              className={`flex flex-col items-center gap-1 py-2 px-4 ${
                isMoreActive || showMore ? "text-cine-accent" : "text-cine-muted"
              }`}
            >
              <MoreHorizontal size={22} />
              <span className="text-[10px] font-medium">Más</span>
            </button>
            {showMore && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-cine-card border border-cine-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                <Link
                  to="/notifications"
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    pathname === "/notifications"
                      ? "bg-cine-accent/10 text-cine-accent"
                      : "text-cine-muted hover:text-white hover:bg-white/5"
                  }`}
                >
                  <NotificationBell className="" />
                  <span>Avisos</span>
                </Link>
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      pathname === to
                        ? "bg-cine-accent/10 text-cine-accent"
                        : "text-cine-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
