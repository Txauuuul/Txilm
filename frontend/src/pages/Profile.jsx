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
  BarChart3,
  Lock,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react";
import {
  getProfile,
  getUserLists,
  generateInviteCodes,
  getInviteCodes,
  getMyStats,
  getUserStats,
  changePassword,
  followUser,
  unfollowUser,
  getFollowCounts,
  getFollowing,
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

  // Stats
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // Change password
  const [showPassword, setShowPassword] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Follow system
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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

  // Load stats
  useEffect(() => {
    if (!targetId) return;
    const fetchStats = isMe ? getMyStats : () => getUserStats(targetId);
    fetchStats().then(setStats).catch(() => {});
  }, [targetId, isMe]);

  // Load follow counts and status
  useEffect(() => {
    if (!targetId) return;
    getFollowCounts(targetId).then(setFollowCounts).catch(() => {});
    if (!isMe && currentUser) {
      getFollowing().then((following) => {
        setIsFollowing(following.includes(targetId));
      }).catch(() => {});
    }
  }, [targetId, isMe, currentUser]);

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

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(targetId);
        setIsFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followUser(targetId);
        setIsFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch {}
    setFollowLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) {
      setPwMsg({ type: "error", text: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await changePassword(oldPw, newPw);
      setPwMsg({ type: "success", text: "Contraseña cambiada correctamente" });
      setOldPw("");
      setNewPw("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.detail || "Error al cambiar contraseña" });
    }
    setPwLoading(false);
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

          {/* Follow counts */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-sm">
              <span className="font-bold text-white">{followCounts.followers}</span>{" "}
              <span className="text-cine-muted text-xs">seguidores</span>
            </span>
            <span className="text-sm">
              <span className="font-bold text-white">{followCounts.following}</span>{" "}
              <span className="text-cine-muted text-xs">siguiendo</span>
            </span>
          </div>

          {/* Follow / Unfollow button for other users */}
          {!isMe && currentUser && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                isFollowing
                  ? "bg-cine-card text-cine-muted ring-1 ring-cine-border hover:text-cine-accent hover:ring-cine-accent"
                  : "bg-cine-accent text-white hover:bg-cine-accent/90"
              }`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4" /> Dejar de seguir
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Seguir
                </>
              )}
            </button>
          )}

          {isMe && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-cine-accent ring-1 ring-cine-border hover:ring-cine-accent transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
              </button>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-cine-accent ring-1 ring-cine-border hover:ring-cine-accent transition"
              >
                <Lock className="w-3.5 h-3.5" /> Cambiar contraseña
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-cine-accent ring-1 ring-cine-border hover:ring-cine-accent transition"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Estadísticas
              </button>
              <Link
                to={isMe ? "/achievements" : `/achievements/${targetId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-cine-gold ring-1 ring-cine-border hover:ring-cine-gold transition"
              >
                🏆 Logros
              </Link>
              {isMe && (
                <Link
                  to="/wrapped"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted hover:text-purple-400 ring-1 ring-cine-border hover:ring-purple-400 transition"
                >
                  📊 Wrapped
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Change password form */}
      {isMe && showPassword && (
        <section className="max-w-md mx-auto px-4 mb-4 animate-fadeInUp">
          <div className="bg-cine-card rounded-xl ring-1 ring-cine-border p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cine-accent" /> Cambiar contraseña
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña actual"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="w-full px-3 py-2 bg-cine-bg rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 bg-cine-bg rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                required
                minLength={6}
              />
              {pwMsg && (
                <p className={`text-xs ${pwMsg.type === "error" ? "text-cine-accent" : "text-cine-green"}`}>
                  {pwMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2 bg-cine-accent text-white rounded-lg text-sm font-semibold hover:bg-cine-accent/90 transition disabled:opacity-50"
              >
                {pwLoading ? "Cambiando…" : "Cambiar contraseña"}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Stats section */}
      {showStats && stats && (
        <section className="max-w-xl mx-auto px-4 mb-4 animate-fadeInUp">
          <div className="bg-cine-card rounded-xl ring-1 ring-cine-border p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cine-accent" /> Estadísticas
            </h3>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Vistas" value={stats.total_watched} emoji="👁️" />
              <StatCard label="Favoritas" value={stats.total_favorites} emoji="❤️" />
              <StatCard label="Pendientes" value={stats.total_watchlist} emoji="🔖" />
              <StatCard label="Media" value={stats.avg_rating ? `${stats.avg_rating}/10` : "—"} emoji="⭐" />
            </div>

            {/* Streak cards */}
            {(stats.current_streak > 0 || stats.max_streak > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-cine-bg rounded-xl p-3 text-center ring-1 ring-cine-border">
                  <p className="text-lg">🔥</p>
                  <p className="text-lg font-extrabold text-orange-400">{stats.current_streak}</p>
                  <p className="text-[10px] text-cine-muted">Racha actual (días)</p>
                </div>
                <div className="bg-cine-bg rounded-xl p-3 text-center ring-1 ring-cine-border">
                  <p className="text-lg">🏆</p>
                  <p className="text-lg font-extrabold text-cine-gold">{stats.max_streak}</p>
                  <p className="text-[10px] text-cine-muted">Mejor racha (días)</p>
                </div>
              </div>
            )}

            {/* Genre breakdown */}
            {stats.top_genres?.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] text-cine-muted mb-2">Géneros más vistos</p>
                <div className="space-y-1.5">
                  {stats.top_genres.map((g) => {
                    const max = stats.top_genres[0]?.count || 1;
                    const pct = Math.max((g.count / max) * 100, 8);
                    return (
                      <div key={g.genre} className="flex items-center gap-2">
                        <span className="text-[10px] text-cine-muted w-20 text-right flex-shrink-0 truncate">{g.genre}</span>
                        <div className="flex-1 h-4 bg-cine-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cine-accent to-cine-accent/60 rounded-full transition-all flex items-center justify-end pr-1.5"
                            style={{ width: `${pct}%` }}
                          >
                            <span className="text-[9px] font-bold text-white">{g.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly chart */}
            {stats.monthly_watched && (
              <div className="mb-4">
                <p className="text-[11px] text-cine-muted mb-2">Películas vistas por mes</p>
                <div className="flex items-end gap-1 h-24">
                  {stats.monthly_watched.map((m) => {
                    const max = Math.max(...stats.monthly_watched.map((x) => x.count), 1);
                    const h = Math.max((m.count / max) * 100, 4);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-cine-muted">{m.count}</span>
                        <div
                          className="w-full bg-cine-accent/80 rounded-t transition-all"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[9px] text-cine-muted">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rating distribution */}
            {stats.rating_distribution && (
              <div>
                <p className="text-[11px] text-cine-muted mb-2">Distribución de notas</p>
                <div className="flex items-end gap-0.5 h-16">
                  {Object.entries(stats.rating_distribution).map(([rating, count]) => {
                    const max = Math.max(...Object.values(stats.rating_distribution), 1);
                    const h = Math.max((count / max) * 100, 4);
                    return (
                      <div key={rating} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[8px] text-cine-muted">{count}</span>
                        <div
                          className="w-full bg-cine-gold/80 rounded-t transition-all"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[8px] text-cine-muted">{rating}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

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

/* ── Helper component ── */
function StatCard({ label, value, emoji }) {
  return (
    <div className="bg-cine-bg rounded-xl p-3 text-center ring-1 ring-cine-border">
      <p className="text-lg">{emoji}</p>
      <p className="text-lg font-extrabold text-white">{value}</p>
      <p className="text-[10px] text-cine-muted">{label}</p>
    </div>
  );
}
