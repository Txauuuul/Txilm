import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GitCompare, Users, ArrowRight, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getProfiles, compareUsers } from "../api/api";
import useAuthStore from "../store/useAuthStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function Compare() {
  const currentUser = useAuthStore((s) => s.user);
  const [profiles, setProfiles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);

  useEffect(() => {
    setProfilesLoading(true);
    getProfiles()
      .then((p) => setProfiles(p.filter((u) => u.id !== currentUser?.id)))
      .catch(() => {})
      .finally(() => setProfilesLoading(false));
  }, [currentUser]);

  const handleCompare = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    setComparison(null);
    try {
      const data = await compareUsers(user.id);
      setComparison(data);
    } catch {
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (pct) => {
    if (pct >= 75) return "text-cine-green";
    if (pct >= 50) return "text-cine-gold";
    if (pct >= 25) return "text-orange-400";
    return "text-cine-accent";
  };

  const getDiffIcon = (diff) => {
    if (diff === 0) return <Minus className="w-3.5 h-3.5 text-cine-muted" />;
    if (diff <= 2) return <TrendingUp className="w-3.5 h-3.5 text-cine-green" />;
    return <TrendingDown className="w-3.5 h-3.5 text-cine-accent" />;
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-cine-accent" /> Comparar gustos
          </h1>
          <p className="text-cine-muted text-sm mt-1">
            Elige un usuario para comparar vuestras puntuaciones
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 mt-4">
        {/* User selector */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-cine-muted mb-3">Selecciona un usuario</h2>
          {profilesLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-20 h-24 skeleton rounded-xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleCompare(p)}
                  className={`flex-shrink-0 w-20 p-3 rounded-xl ring-1 transition text-center ${
                    selectedUser?.id === p.id
                      ? "bg-cine-accent/10 ring-cine-accent"
                      : "bg-cine-card ring-cine-border hover:ring-white/20"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-cine-border mx-auto flex items-center justify-center text-sm font-bold uppercase text-cine-accent">
                    {p.username?.charAt(0) || "?"}
                  </div>
                  <p className="text-[11px] font-medium mt-1.5 truncate">{p.username}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl animate-bounce mb-3">⚖️</div>
            <p className="text-sm text-cine-muted">Comparando gustos...</p>
          </div>
        )}

        {/* Comparison result */}
        {comparison && !loading && selectedUser && (
          <div className="animate-fadeInUp space-y-4">
            {/* Header with compatibility */}
            <div className="bg-cine-card rounded-2xl ring-1 ring-cine-border p-5 text-center">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-cine-border mx-auto flex items-center justify-center text-lg font-bold uppercase text-cine-accent">
                    {currentUser?.username?.charAt(0) || "?"}
                  </div>
                  <p className="text-xs font-medium mt-1">{currentUser?.username}</p>
                </div>
                <div className="text-cine-muted">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-cine-border mx-auto flex items-center justify-center text-lg font-bold uppercase text-cine-accent">
                    {selectedUser.username?.charAt(0) || "?"}
                  </div>
                  <p className="text-xs font-medium mt-1">{selectedUser.username}</p>
                </div>
              </div>

              <div className={`text-4xl font-extrabold ${getCompatibilityColor(comparison.compatibility)}`}>
                {comparison.compatibility}%
              </div>
              <p className="text-xs text-cine-muted mt-1">
                Compatibilidad cinematográfica
              </p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-cine-bg rounded-xl p-2.5 ring-1 ring-cine-border">
                  <p className="text-lg font-bold text-white">{comparison.common_count}</p>
                  <p className="text-[10px] text-cine-muted">En común</p>
                </div>
                <div className="bg-cine-bg rounded-xl p-2.5 ring-1 ring-cine-border">
                  <p className="text-lg font-bold text-cine-gold">{comparison.avg_diff}</p>
                  <p className="text-[10px] text-cine-muted">Dif. media</p>
                </div>
                <div className="bg-cine-bg rounded-xl p-2.5 ring-1 ring-cine-border">
                  <p className="text-lg font-bold text-white">{comparison.only_a + comparison.only_b}</p>
                  <p className="text-[10px] text-cine-muted">Únicas</p>
                </div>
              </div>
            </div>

            {/* Common movies list */}
            {comparison.common_movies.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-cine-gold" />
                  Películas en común ({comparison.common_count})
                </h3>
                <div className="space-y-2">
                  {comparison.common_movies.map((m) => (
                    <Link
                      key={m.tmdb_id}
                      to={`/movie/${m.tmdb_id}`}
                      className="flex items-center gap-3 bg-cine-card rounded-xl p-3 ring-1 ring-cine-border hover:ring-cine-accent/30 transition group"
                    >
                      {imgUrl(m.movie_poster) ? (
                        <img
                          src={imgUrl(m.movie_poster)}
                          alt={m.movie_title}
                          className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded-lg bg-cine-border flex items-center justify-center flex-shrink-0">
                          🎬
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1 group-hover:text-cine-accent transition">
                          {m.movie_title}
                        </p>
                        <p className="text-[11px] text-cine-muted">{m.movie_year || "—"}</p>
                        {/* Reviews */}
                        {(m.review_a || m.review_b) && (
                          <div className="mt-1 space-y-0.5">
                            {m.review_a && (
                              <p className="text-[10px] text-cine-muted italic line-clamp-1">
                                {currentUser?.username}: "{m.review_a}"
                              </p>
                            )}
                            {m.review_b && (
                              <p className="text-[10px] text-cine-muted italic line-clamp-1">
                                {selectedUser.username}: "{m.review_b}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] text-cine-muted">Tú</p>
                          <p className="text-sm font-bold text-cine-gold">
                            {typeof m.rating_a === 'number' ? m.rating_a.toFixed(1) : m.rating_a}
                          </p>
                        </div>
                        {getDiffIcon(m.diff)}
                        <div className="text-center">
                          <p className="text-[10px] text-cine-muted">{selectedUser.username?.slice(0, 6)}</p>
                          <p className="text-sm font-bold text-cine-gold">
                            {typeof m.rating_b === 'number' ? m.rating_b.toFixed(1) : m.rating_b}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {comparison.common_count === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🤷</p>
                <p className="text-sm text-cine-muted">
                  No tenéis películas puntuadas en común todavía
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
