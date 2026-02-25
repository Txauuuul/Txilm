import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Search } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/lists", icon: Heart, label: "Mis Listas" },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <>
      {/* ── Top bar (desktop) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cine-bg/80 backdrop-blur-xl border-b border-cine-border hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-cine-accent tracking-tight">
              🎬 Txilms
            </span>
          </Link>
          <nav className="flex gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
        </div>
      </header>

      {/* ── Bottom tab bar (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cine-bg/90 backdrop-blur-xl border-t border-cine-border md:hidden safe-bottom">
        <div className="flex justify-around items-center h-16 pb-safe">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2 px-4 ${
                pathname === to ? "text-cine-accent" : "text-cine-muted"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
