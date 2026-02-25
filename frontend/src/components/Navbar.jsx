import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Bell, User, Users } from "lucide-react";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import useAuthStore from "../store/useAuthStore";

export default function Navbar() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);

  const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Inicio" },
    { to: "/lists", icon: Heart, label: "Mis Listas" },
    { to: "/social", icon: Users, label: "Social" },
    { to: "/notifications", icon: Bell, label: "Avisos", isBell: true },
    { to: "/profile", icon: User, label: "Perfil" },
  ];

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
          {NAV_ITEMS.map(({ to, icon: Icon, label, isBell }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center gap-1 py-2 px-4 ${
                pathname === to ? "text-cine-accent" : "text-cine-muted"
              }`}
            >
              {isBell ? (
                <NotificationBell className="" />
              ) : (
                <Icon size={22} />
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
