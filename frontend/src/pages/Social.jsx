import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Heart, Eye, Bookmark, Star, Shield, UserPlus, UserMinus, Search } from "lucide-react";
import { getProfiles, getUserLists, followUser, unfollowUser, getFollowing } from "../api/api";
import useAuthStore from "../store/useAuthStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function Social() {
  const currentUser = useAuthStore((s) => s.user);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // userId expandido
  const [userLists, setUserLists] = useState({}); // { userId: items[] }
  const [loadingLists, setLoadingLists] = useState({});
  const [followingSet, setFollowingSet] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | following | followers

  useEffect(() => {
    setLoading(true);
    getProfiles()
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load who I follow
    if (currentUser) {
      getFollowing()
        .then((ids) => setFollowingSet(new Set(ids)))
        .catch(() => {});
    }
  }, [currentUser]);

  const toggleExpand = async (userId) => {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);

    // Cargar listas si no están cacheadas
    if (!userLists[userId]) {
      setLoadingLists((prev) => ({ ...prev, [userId]: true }));
      try {
        const lists = await getUserLists(userId);
        setUserLists((prev) => ({ ...prev, [userId]: lists }));
      } catch {
        setUserLists((prev) => ({ ...prev, [userId]: [] }));
      } finally {
        setLoadingLists((prev) => ({ ...prev, [userId]: false }));
      }
    }
  };

  const getListByType = (userId, type) =>
    (userLists[userId] || []).filter((i) => i.list_type === type);

  const handleFollow = async (userId, e) => {
    e.stopPropagation();
    if (followLoading) return;
    setFollowLoading(userId);
    try {
      if (followingSet.has(userId)) {
        await unfollowUser(userId);
        setFollowingSet((prev) => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await followUser(userId);
        setFollowingSet((prev) => new Set(prev).add(userId));
      }
    } catch {}
    setFollowLoading(null);
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = !searchQuery.trim() || (p.username || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "following") return followingSet.has(p.id);
    if (filter === "followers") return false; // Can't determine followers client-side easily
    return true;
  });

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* header */}
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <Users className="w-6 h-6 text-cine-accent" /> Social
          </h1>
          <p className="text-cine-muted text-sm mt-1">
            Usuarios de la plataforma y sus películas
          </p>

          {/* Search bar + filter tabs */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cine-muted" />
              <input
                type="text"
                placeholder="Buscar usuario…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition"
              />
            </div>
            <div className="flex gap-1">
              {[{ key: "all", label: "Todos" }, { key: "following", label: "Siguiendo" }].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition ring-1 ${
                    filter === f.key
                      ? "bg-cine-accent/10 ring-cine-accent text-cine-accent"
                      : "bg-cine-card ring-cine-border text-cine-muted hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Users list */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-center text-cine-muted py-12">
            No hay usuarios todavía
          </p>
        ) : filteredProfiles.length === 0 ? (
          <p className="text-center text-cine-muted py-12">
            {searchQuery.trim() ? `No se encontraron usuarios con "${searchQuery}"` : "No sigues a nadie aún"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((p) => {
              const isExpanded = expanded === p.id;
              const isMe = p.id === currentUser?.id;
              const lists = userLists[p.id] || [];
              const favorites = getListByType(p.id, "favorite");
              const watchedList = getListByType(p.id, "watched");
              const watchlistItems = getListByType(p.id, "watchlist");
              const ratedMovies = watchedList.filter((m) => m.rating);

              return (
                <div
                  key={p.id}
                  className="bg-cine-card rounded-xl ring-1 ring-cine-border overflow-hidden transition"
                >
                  {/* User row */}
                  <div className="flex items-center gap-3 p-4">
                    {/* Avatar — links to profile */}
                    <Link
                      to={`/profile/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-12 h-12 rounded-full bg-cine-border flex items-center justify-center text-lg font-bold uppercase text-cine-accent flex-shrink-0 hover:ring-2 hover:ring-cine-accent transition"
                    >
                      {p.username?.charAt(0) || "?"}
                    </Link>

                    {/* Info — clickable to expand */}
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="flex-1 min-w-0 text-left hover:opacity-80 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-bold hover:text-cine-accent transition"
                        >
                          {p.username}
                        </Link>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cine-accent/10 text-cine-accent">
                            Tú
                          </span>
                        )}
                        {p.is_admin && (
                          <Shield className="w-3.5 h-3.5 text-cine-gold" />
                        )}
                      </div>
                      <p className="text-xs text-cine-muted">
                        Desde{" "}
                        {new Date(p.created_at).toLocaleDateString("es-ES", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </button>

                    {/* Follow button */}
                    {!isMe && currentUser && (
                      <button
                        onClick={(e) => handleFollow(p.id, e)}
                        disabled={followLoading === p.id}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ring-1 flex-shrink-0 ${
                          followingSet.has(p.id)
                            ? "text-cine-accent ring-cine-accent bg-cine-accent/10 hover:bg-cine-accent/20"
                            : "text-cine-muted ring-cine-border hover:text-cine-accent hover:ring-cine-accent"
                        }`}
                      >
                        {followingSet.has(p.id) ? (
                          <><UserMinus className="w-3.5 h-3.5" /> Siguiendo</>
                        ) : (
                          <><UserPlus className="w-3.5 h-3.5" /> Seguir</>
                        )}
                      </button>
                    )}

                    {/* Expand chevron */}
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="p-1 text-cine-muted hover:text-white transition"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-cine-border px-4 py-4">
                      {loadingLists[p.id] ? (
                        <div className="space-y-2">
                          <div className="h-6 w-32 skeleton rounded" />
                          <div className="h-16 skeleton rounded-xl" />
                        </div>
                      ) : lists.length === 0 ? (
                        <p className="text-xs text-cine-muted text-center py-4">
                          Este usuario aún no tiene películas guardadas
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {/* Puntuaciones */}
                          {ratedMovies.length > 0 && (
                            <ListSection
                              icon={<Star className="w-4 h-4 text-cine-gold" />}
                              title="Puntuaciones"
                              count={ratedMovies.length}
                              color="text-cine-gold"
                            >
                              {ratedMovies
                                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                                .map((m) => (
                                  <MovieItem
                                    key={m.id}
                                    item={m}
                                    extra={
                                      <span className="text-cine-gold text-xs font-bold flex-shrink-0">
                                        ⭐ {m.rating}/10
                                      </span>
                                    }
                                  />
                                ))}
                            </ListSection>
                          )}

                          {/* Favoritas */}
                          {favorites.length > 0 && (
                            <ListSection
                              icon={<Heart className="w-4 h-4 text-cine-accent" />}
                              title="Favoritas"
                              count={favorites.length}
                              color="text-cine-accent"
                            >
                              {favorites.map((m) => (
                                <MovieItem key={m.id} item={m} />
                              ))}
                            </ListSection>
                          )}

                          {/* Vistas */}
                          {watchedList.length > 0 && (
                            <ListSection
                              icon={<Eye className="w-4 h-4 text-cine-green" />}
                              title="Vistas"
                              count={watchedList.length}
                              color="text-cine-green"
                            >
                              {watchedList.map((m) => (
                                <MovieItem
                                  key={m.id}
                                  item={m}
                                  extra={
                                    m.rating && (
                                      <span className="text-cine-gold text-xs font-bold flex-shrink-0">
                                        ⭐ {m.rating}
                                      </span>
                                    )
                                  }
                                />
                              ))}
                            </ListSection>
                          )}

                          {/* Pendientes */}
                          {watchlistItems.length > 0 && (
                            <ListSection
                              icon={
                                <Bookmark className="w-4 h-4 text-cine-gold" />
                              }
                              title="Pendientes"
                              count={watchlistItems.length}
                              color="text-cine-gold"
                            >
                              {watchlistItems.map((m) => (
                                <MovieItem key={m.id} item={m} />
                              ))}
                            </ListSection>
                          )}

                          {/* Enlace al perfil completo */}
                          <Link
                            to={`/profile/${p.id}`}
                            className="inline-flex items-center gap-1 text-xs text-cine-accent hover:underline"
                          >
                            Ver perfil completo →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ListSection({ icon, title, count, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className={`text-xs font-bold ${color}`}>{title}</span>
        <span className="text-[11px] text-cine-muted px-1.5 py-0.5 rounded-full bg-cine-bg">
          {count}
        </span>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">{children}</div>
    </div>
  );
}

function MovieItem({ item, extra }) {
  const posterUrl = imgUrl(item.movie_poster);

  return (
    <Link
      to={`/movie/${item.tmdb_id}`}
      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition group"
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={item.movie_title}
          className="w-8 h-12 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-12 rounded bg-cine-border flex items-center justify-center text-xs flex-shrink-0">
          🎬
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold line-clamp-1 group-hover:text-cine-accent transition">
          {item.movie_title}
        </p>
        <p className="text-[11px] text-cine-muted">{item.movie_year || "—"}</p>
      </div>
      {extra}
    </Link>
  );
}
