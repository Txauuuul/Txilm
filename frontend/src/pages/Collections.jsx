import { useState, useEffect } from "react";
import { Film, Play, Trophy, Sparkles, Clapperboard, Ghost, Heart, Rocket, Swords, Laugh } from "lucide-react";
import { discoverMovies } from "../api/api";
import MovieCard from "../components/MovieCard";

const COLLECTIONS = [
  {
    id: "best_ever",
    title: "Mejores de la historia",
    description: "Las películas mejor valoradas de todos los tiempos",
    emoji: "🏆",
    Icon: Trophy,
    color: "text-cine-gold",
    params: { sortBy: "vote_average.desc", voteCountGte: 5000 },
  },
  {
    id: "modern_classics",
    title: "Clásicos modernos (2010s)",
    description: "Las joyas de la última década",
    emoji: "✨",
    Icon: Sparkles,
    color: "text-purple-400",
    params: { sortBy: "vote_average.desc", voteCountGte: 3000 },
    yearRange: { from: 2010, to: 2019 },
  },
  {
    id: "directors_cut",
    title: "Cine de autor",
    description: "Drama de alta calidad para cinéfilos",
    emoji: "🎬",
    Icon: Clapperboard,
    color: "text-cine-accent",
    params: { sortBy: "vote_average.desc", withGenres: "18", voteCountGte: 2000 },
  },
  {
    id: "scifi_masterpieces",
    title: "Ciencia ficción épica",
    description: "Los mejores viajes al espacio y al futuro",
    emoji: "🚀",
    Icon: Rocket,
    color: "text-blue-400",
    params: { sortBy: "vote_average.desc", withGenres: "878", voteCountGte: 1500 },
  },
  {
    id: "horror_essentials",
    title: "Terror esencial",
    description: "Las películas de terror que debes ver",
    emoji: "👻",
    Icon: Ghost,
    color: "text-green-400",
    params: { sortBy: "vote_average.desc", withGenres: "27", voteCountGte: 1000 },
  },
  {
    id: "action_packed",
    title: "Acción explosiva",
    description: "Adrenalina pura con las mejores valoradas",
    emoji: "⚔️",
    Icon: Swords,
    color: "text-red-400",
    params: { sortBy: "vote_average.desc", withGenres: "28", voteCountGte: 2000 },
  },
  {
    id: "comedy_gold",
    title: "Comedias de oro",
    description: "Las comedias que siempre te sacarán una risa",
    emoji: "😂",
    Icon: Laugh,
    color: "text-yellow-400",
    params: { sortBy: "vote_average.desc", withGenres: "35", voteCountGte: 2000 },
  },
  {
    id: "romance",
    title: "Historias de amor",
    description: "Películas románticas que te llegarán al corazón",
    emoji: "❤️",
    Icon: Heart,
    color: "text-pink-400",
    params: { sortBy: "vote_average.desc", withGenres: "10749", voteCountGte: 1000 },
  },
  {
    id: "animated_gems",
    title: "Animación para todos",
    description: "Las mejores películas animadas jamás hechas",
    emoji: "🎨",
    Icon: Play,
    color: "text-cyan-400",
    params: { sortBy: "vote_average.desc", withGenres: "16", voteCountGte: 1500 },
  },
  {
    id: "hidden_gems_2020s",
    title: "Joyas recientes (2020s)",
    description: "Películas recientes que no puedes perderte",
    emoji: "💎",
    Icon: Sparkles,
    color: "text-emerald-400",
    params: { sortBy: "vote_average.desc", voteCountGte: 1000 },
    yearRange: { from: 2020, to: 2029 },
  },
];

export default function Collections() {
  const [selected, setSelected] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCollection = async (collection) => {
    if (selected?.id === collection.id) {
      setSelected(null);
      setMovies([]);
      return;
    }
    setSelected(collection);
    setLoading(true);
    try {
      const data = await discoverMovies(collection.params);
      let items = Array.isArray(data) ? data : data.results || [];
      if (collection.yearRange) {
        items = items.filter((m) => {
          const yr = parseInt(m.year);
          return yr >= collection.yearRange.from && yr <= collection.yearRange.to;
        });
      }
      setMovies(items);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <Film className="w-6 h-6 text-cine-accent" /> Colecciones
          </h1>
          <p className="text-cine-muted text-sm mt-1">
            Colecciones temáticas curadas para descubrir cine
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 mt-4">
        {/* Collection cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLLECTIONS.map((c) => {
            const isActive = selected?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => loadCollection(c)}
                className={`text-left p-4 rounded-xl ring-1 transition ${
                  isActive
                    ? "bg-cine-accent/10 ring-cine-accent"
                    : "bg-cine-card ring-cine-border hover:ring-white/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold ${isActive ? "text-cine-accent" : ""}`}>
                      {c.title}
                    </h3>
                    <p className="text-[11px] text-cine-muted line-clamp-1">
                      {c.description}
                    </p>
                  </div>
                  <c.Icon className={`w-5 h-5 flex-shrink-0 ${c.color}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected collection movies */}
        {selected && (
          <section className="mt-6 animate-fadeInUp">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <span>{selected.emoji}</span> {selected.title}
            </h2>
            <p className="text-sm text-cine-muted mb-4">{selected.description}</p>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
                ))}
              </div>
            ) : movies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {movies.map((m) => (
                  <MovieCard key={m.tmdb_id} movie={m} size="full" />
                ))}
              </div>
            ) : (
              <p className="text-cine-muted text-center py-12">
                No se encontraron películas
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
