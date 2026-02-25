import { useState, useEffect } from "react";
import { Heart, Bookmark, Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import useStore from "../store/useStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

const TABS = [
  { key: "favorites", label: "Favoritas", Icon: Heart, color: "text-cine-accent" },
  { key: "watchlist", label: "Pendientes", Icon: Bookmark, color: "text-cine-gold" },
  { key: "watched", label: "Vistas", Icon: Eye, color: "text-cine-green" },
];

export default function Lists() {
  const [activeTab, setActiveTab] = useState("favorites");
  const {
    favorites,
    watchlist,
    watched,
    removeFavorite,
    removeFromWatchlist,
    removeFromWatched,
    fetchLists,
    listsLoaded,
  } = useStore();

  // Fetch lists from API on mount
  useEffect(() => {
    fetchLists();
  }, []);

  const lists = { favorites, watchlist, watched };
  const removeFns = {
    favorites: removeFavorite,
    watchlist: removeFromWatchlist,
    watched: removeFromWatched,
  };

  const currentList = lists[activeTab] || [];
  const currentRemove = removeFns[activeTab];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* header */}
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold">Mis Listas</h1>
          <p className="text-cine-muted text-sm mt-1">
            Gestiona tus películas favoritas, pendientes y vistas
          </p>
        </div>
      </section>

      {/* tabs */}
      <section className="sticky sticky-safe z-30 bg-cine-bg/80 backdrop-blur-lg border-b border-cine-border px-4 py-2">
        <div className="max-w-4xl mx-auto flex gap-1">
          {TABS.map(({ key, label, Icon, color }) => {
            const active = activeTab === key;
            const count = lists[key]?.length || 0;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
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
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-cine-muted">
            {activeTab === "favorites" && <Heart className="w-12 h-12 mb-3 opacity-30" />}
            {activeTab === "watchlist" && <Bookmark className="w-12 h-12 mb-3 opacity-30" />}
            {activeTab === "watched" && <Eye className="w-12 h-12 mb-3 opacity-30" />}
            <p className="text-sm">No hay películas aquí todavía</p>
            <Link
              to="/"
              className="mt-3 text-cine-accent text-sm hover:underline"
            >
              Descubre películas →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map((m) => (
              <ListItem
                key={m.tmdb_id}
                movie={m}
                onRemove={() => currentRemove(m.tmdb_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListItem({ movie, onRemove }) {
  const posterUrl = imgUrl(movie.poster, "w92");

  return (
    <div className="flex items-center gap-3 bg-cine-card rounded-xl p-2.5 ring-1 ring-cine-border hover:ring-cine-accent/30 transition group">
      {/* poster thumbnail */}
      <Link to={`/movie/${movie.tmdb_id}`} className="flex-shrink-0">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-12 h-[72px] rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-[72px] rounded-lg bg-cine-border flex items-center justify-center text-cine-muted text-lg">
            🎬
          </div>
        )}
      </Link>

      {/* info */}
      <Link to={`/movie/${movie.tmdb_id}`} className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-1 group-hover:text-cine-accent transition">
          {movie.title}
        </p>
        <p className="text-xs text-cine-muted">{movie.year || "—"}</p>
        {movie.rating && (
          <span className="text-xs text-cine-gold">
            ⭐ {movie.rating}/10
          </span>
        )}
        {!movie.rating && movie.vote_average && (
          <span className="text-xs text-cine-gold">
            ⭐ {movie.vote_average}
          </span>
        )}
      </Link>

      {/* remove button */}
      <button
        onClick={onRemove}
        className="p-2 text-cine-muted hover:text-cine-accent transition rounded-lg hover:bg-white/5"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
