import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Eye,
  Shield,
  Key,
  Copy,
  Check,
  LogOut,
} from "lucide-react";
import {
  getProfile,
  getUserLists,
  generateInviteCodes,
  getInviteCodes,
} from "../api/api";
import useAuthStore from "../store/useAuthStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

const LIST_TABS = [
  { key: "favorite", label: "Favoritas", Icon: Heart, color: "text-cine-accent" },
  { key: "watchlist", label: "Pendientes", Icon: Bookmark, color: "text-cine-gold" },
  { key: "watched", label: "Vistas", Icon: Eye, color: "text-cine-green" },
];

export default function Profile() {
  const { userId } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const targetId = userId || currentUser?.id;
  const isMe = targetId === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [tab, setTab] = useState("favorite");
  const [loading, setLoading] = useState(true);

  // Admin: invite codes
  const [codes, setCodes] = useState([]);
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    Promise.all([
      isMe ? Promise.resolve(currentUser) : getProfile(targetId),
      getUserLists(targetId),
    ])
      .then(([p, l]) => {
        setProfile(p);
        setLists(l);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetId, isMe, currentUser]);

  // Load invite codes if admin
  useEffect(() => {
    if (isMe && currentUser?.is_admin) {
      getInviteCodes().then(setCodes).catch(() => {});
    }
  }, [isMe, currentUser]);

  const filteredList = lists.filter((i) => i.list_type === tab);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newCodes = await generateInviteCodes(genCount);
      // Refresh all codes
      const all = await getInviteCodes();
      setCodes(all);
    } catch {
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-8 space-y-4">
          <div className="h-20 w-20 rounded-full skeleton mx-auto" />
          <div className="h-6 w-32 skeleton rounded mx-auto" />
          <div className="h-4 w-48 skeleton rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-cine-muted">Perfil no encontrado</p>
        <Link to="/" className="text-cine-accent hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* header */}
      <section className="px-4 pt-6 md:pt-10 pb-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* avatar */}
          <div className="w-20 h-20 rounded-full bg-cine-card ring-2 ring-cine-border mx-auto flex items-center justify-center text-2xl font-bold uppercase text-cine-accent">
            {profile.username?.charAt(0) || "?"}
          </div>
          <h1 className="text-xl font-extrabold mt-3">{profile.username}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            {profile.is_admin && (
              <span className="flex items-center gap-1 text-xs text-cine-gold">
                <Shield className="w-3.5 h-3.5" /> Admin
              </span>
            )}
            <span className="text-xs text-cine-muted">
              {lists.length} películas guardadas
            </span>
          </div>

          {isMe && (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-cine-accent ring-1 ring-cine-border hover:ring-cine-accent transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          )}
        </div>
      </section>

      {/* list tabs */}
      <section className="sticky sticky-safe z-30 bg-cine-bg/80 backdrop-blur-lg border-b border-cine-border px-4 py-2">
        <div className="max-w-4xl mx-auto flex gap-1">
          {LIST_TABS.map(({ key, label, Icon, color }) => {
            const active = tab === key;
            const count = lists.filter((i) => i.list_type === key).length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? `${color} bg-white/5 ring-1 ring-current`
                    : "text-cine-muted hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" fill={active ? "currentColor" : "none"} />
                {label}
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/10" : "bg-cine-card"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* list content */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        {filteredList.length === 0 ? (
          <p className="text-center text-cine-muted text-sm py-12">
            No hay películas en esta lista
          </p>
        ) : (
          <div className="space-y-2">
            {filteredList.map((item) => (
              <Link
                key={`${item.tmdb_id}-${item.list_type}`}
                to={`/movie/${item.tmdb_id}`}
                className="flex items-center gap-3 bg-cine-card rounded-xl p-2.5 ring-1 ring-cine-border hover:ring-cine-accent/30 transition group"
              >
                {imgUrl(item.movie_poster) ? (
                  <img
                    src={imgUrl(item.movie_poster)}
                    alt={item.movie_title}
                    className="w-12 h-[72px] rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-[72px] rounded-lg bg-cine-border flex items-center justify-center text-cine-muted flex-shrink-0">
                    🎬
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1 group-hover:text-cine-accent transition">
                    {item.movie_title}
                  </p>
                  <p className="text-xs text-cine-muted">
                    {item.movie_year || "—"}
                  </p>
                  {item.rating && (
                    <span className="text-xs text-cine-gold">
                      ⭐ {item.rating}/10
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Admin: Invite codes */}
      {isMe && currentUser?.is_admin && (
        <section className="max-w-4xl mx-auto px-4 mt-8 pb-8">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-cine-gold" /> Códigos de invitación
          </h2>

          {/* Generate */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              min={1}
              max={20}
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
              className="w-16 px-2 py-1.5 bg-cine-card rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-1.5 bg-cine-accent text-white rounded-lg text-sm font-medium hover:bg-cine-accent/90 transition disabled:opacity-50"
            >
              {generating ? "Generando…" : "Generar códigos"}
            </button>
          </div>

          {/* Codes list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {codes.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ring-1 ${
                  c.used_by
                    ? "ring-cine-border/50 text-cine-muted"
                    : "ring-cine-border text-white"
                }`}
              >
                <code className="flex-1 font-mono tracking-wider">
                  {c.code}
                </code>
                {c.used_by ? (
                  <span className="text-cine-muted">Usado</span>
                ) : (
                  <button
                    onClick={() => copyCode(c.code)}
                    className="p-1 text-cine-muted hover:text-cine-accent transition"
                    title="Copiar"
                  >
                    {copied === c.code ? (
                      <Check className="w-3.5 h-3.5 text-cine-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
