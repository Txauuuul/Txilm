import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Heart, Bookmark, Star, MessageSquare } from "lucide-react";
import { getFeed } from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";
function imgUrl(p, s = "w92") {
  if (!p) return null;
  return p.startsWith("http") ? p : `${TMDB_IMG}/${s}${p}`;
}

const TYPE_CONFIG = {
  watched: { label: "ha visto", icon: Eye, color: "text-cine-green" },
  favorite: { label: "ha añadido a favoritas", icon: Heart, color: "text-cine-accent" },
  watchlist: { label: "quiere ver", icon: Bookmark, color: "text-cine-gold" },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function Feed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeed(50)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 md:pt-20 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Feed</h1>
          <p className="text-sm text-cine-muted">Actividad de tus seguidos</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cine-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">👥</p>
          <p className="text-cine-muted text-lg">No hay actividad aún</p>
          <p className="text-cine-muted text-sm mt-2">Sigue a otros usuarios para ver su actividad aquí</p>
          <Link to="/social" className="inline-block mt-4 px-6 py-2 bg-cine-accent text-black rounded-xl font-semibold">
            Ir a Social
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const config = TYPE_CONFIG[item.list_type] || TYPE_CONFIG.watched;
            const Icon = config.icon;
            return (
              <div
                key={item.id || idx}
                className="bg-cine-card border border-cine-border rounded-2xl p-4 hover:border-cine-accent/30 transition"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Link
                    to={`/profile/${item.user_id}`}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-cine-accent to-purple-500 flex items-center justify-center text-sm font-bold text-black shrink-0"
                  >
                    {item.username?.charAt(0)?.toUpperCase() || "?"}
                  </Link>

                  <div className="flex-1 min-w-0">
                    {/* User + action */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/profile/${item.user_id}`} className="font-semibold text-white hover:text-cine-accent transition">
                        {item.username}
                      </Link>
                      <span className={`text-sm ${config.color} flex items-center gap-1`}>
                        <Icon size={14} />
                        {config.label}
                      </span>
                      <span className="text-xs text-cine-muted ml-auto">{timeAgo(item.created_at)}</span>
                    </div>

                    {/* Movie card */}
                    <Link
                      to={`/movie/${item.tmdb_id}`}
                      className="mt-3 flex gap-3 bg-cine-bg/50 rounded-xl p-2 hover:bg-white/5 transition"
                    >
                      {item.movie_poster && (
                        <img
                          src={imgUrl(item.movie_poster, "w154")}
                          alt=""
                          className="w-12 h-18 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.movie_title}</p>
                        {item.movie_year && (
                          <p className="text-xs text-cine-muted">{item.movie_year}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {item.rating != null && (
                            <span className="flex items-center gap-1 text-cine-gold text-sm">
                              <Star size={14} fill="currentColor" />
                              {Number(item.rating).toFixed(1)}
                            </span>
                          )}
                          {item.review && (
                            <span className="flex items-center gap-1 text-cine-muted text-xs">
                              <MessageSquare size={12} />
                              reseña
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Review text */}
                    {item.review && (
                      <p className="mt-2 text-sm text-cine-muted italic line-clamp-2">
                        "{item.review}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
