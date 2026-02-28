import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  searchMovies,
  getTrending,
  getActivity,
  discoverMovies,
  getTopRated,
  getRecommendations,
} from "../api/api";
import MovieCard from "../components/MovieCard";
import useStore from "../store/useStore";

const COUNTRIES = [
  { code: "ES", label: "España" },
  { code: "US", label: "EE.UU." },
  { code: "GB", label: "Reino Unido" },
  { code: "MX", label: "México" },
  { code: "AR", label: "Argentina" },
  { code: "FR", label: "Francia" },
  { code: "DE", label: "Alemania" },
  { code: "IT", label: "Italia" },
  { code: "BR", label: "Brasil" },
  { code: "JP", label: "Japón" },
];

export default function Home() {
  const { country, setCountry, fetchLists, listsLoaded, watched } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [showCountry, setShowCountry] = useState(false);
  const debounceRef = useRef(null);
  const countryRef = useRef(null);

  // New sections state
  const [topRated, setTopRated] = useState([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [animation, setAnimation] = useState([]);
  const [animationLoading, setAnimationLoading] = useState(true);
  const [suspense, setSuspense] = useState([]);
  const [suspenseLoading, setSuspenseLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target))
        setShowCountry(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch trending + activity + lists + new sections on mount
  useEffect(() => {
    setTrendingLoading(true);
    getTrending("week", 1)
      .then((data) => setTrending(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));

    getActivity(15).then(setActivity).catch(() => {});
    if (!listsLoaded) fetchLists();

    // Top rated
    setTopRatedLoading(true);
    getTopRated(1)
      .then((data) => setTopRated(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setTopRatedLoading(false));

    // Best animation (genre 16)
    setAnimationLoading(true);
    discoverMovies({
      withGenres: "16",
      sortBy: "vote_average.desc",
      voteCountGte: 500,
    })
      .then((data) => setAnimation(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setAnimationLoading(false));

    // Best suspense/thriller (genre 53)
    setSuspenseLoading(true);
    discoverMovies({
      withGenres: "53",
      sortBy: "vote_average.desc",
      voteCountGte: 500,
    })
      .then((data) => setSuspense(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setSuspenseLoading(false));
  }, []);

  // Recommendations based on user's last watched movie
  useEffect(() => {
    setRecommendedLoading(true);
    if (watched && watched.length > 0) {
      const lastWatched = watched[0];
      getRecommendations(lastWatched.tmdb_id)
        .then((data) => setRecommended(Array.isArray(data) ? data : data.results || []))
        .catch(() => {
          // Fallback: popular movies
          discoverMovies({ sortBy: "popularity.desc", voteCountGte: 300 })
            .then((data) => setRecommended(Array.isArray(data) ? data : data.results || []))
            .catch(() => {});
        })
        .finally(() => setRecommendedLoading(false));
    } else {
      // No watched movies: show popular as "recommended"
      discoverMovies({ sortBy: "popularity.desc", voteCountGte: 300 })
        .then((data) => setRecommended(Array.isArray(data) ? data : data.results || []))
        .catch(() => {})
        .finally(() => setRecommendedLoading(false));
    }
  }, [watched]);

  // Debounced search
  const handleSearch = useCallback(
    (value) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await searchMovies(value.trim(), country);
          setResults(data.results || []);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [country]
  );

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const showResults = query.trim().length > 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8 overflow-x-hidden">
      {/* Hero / Header */}
      <section className="relative overflow-hidden px-4 pt-6 pb-4 md:pt-10 md:pb-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            <span className="text-cine-accent">Tx</span>
            <span className="text-white">ilms</span>
          </h1>
          <p className="text-cine-muted mt-2 text-sm md:text-base">
            La mierdamienta definitiva para cinéfilos exigentes
          </p>
        </div>
      </section>

      {/* Search bar + country */}
      <section className="sticky sticky-safe z-30 bg-cine-bg/80 backdrop-blur-lg border-b border-cine-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cine-muted" />
            <input
              type="text"
              placeholder="Buscar película o serie…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cine-muted hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Country selector */}
          <div className="relative" ref={countryRef}>
            <button
              onClick={() => setShowCountry(!showCountry)}
              className="flex items-center gap-1 px-3 py-2.5 bg-cine-card rounded-xl text-sm ring-1 ring-cine-border hover:ring-cine-accent transition"
            >
              <span>{country}</span>
              <ChevronDown className="w-3.5 h-3.5 text-cine-muted" />
            </button>
            {showCountry && (
              <div className="absolute right-0 mt-1 w-44 bg-cine-card rounded-xl ring-1 ring-cine-border shadow-xl overflow-hidden animate-fadeInUp z-50">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setShowCountry(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-cine-border/40 transition ${
                      country === c.code
                        ? "text-cine-accent font-semibold"
                        : "text-white"
                    }`}
                  >
                    {c.code} — {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* Search results */}
        {showResults ? (
          <section>
            <h2 className="text-lg font-bold mb-4">
              Resultados para{" "}
              <span className="text-cine-accent">"{query}"</span>
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-xl skeleton"
                  />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.map((m) => (
                  <MovieCard key={m.tmdb_id} movie={m} size="full" />
                ))}
              </div>
            ) : (
              <p className="text-cine-muted text-center py-12">
                No se encontraron resultados
              </p>
            )}
          </section>
        ) : (
          <>
            {/* Activity feed */}
            {activity.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold mb-4">
                  👥 Actividad de amigos
                </h2>
                <div className="space-y-2">
                  {activity.slice(0, 10).map((item) => (
                    <Link
                      key={item.id}
                      to={`/movie/${item.tmdb_id}`}
                      className="flex items-center gap-3 bg-cine-card rounded-xl p-2.5 ring-1 ring-cine-border hover:ring-cine-accent/30 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-cine-border flex items-center justify-center text-xs font-bold uppercase text-cine-accent flex-shrink-0">
                        {item.username?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">
                          <span className="font-semibold text-white">
                            {item.username}
                          </span>{" "}
                          <span className="text-cine-muted">
                            {item.list_type === "watched"
                              ? item.rating
                                ? `puntuó con ${item.rating}/10`
                                : "marcó como vista"
                              : item.list_type === "favorite"
                              ? "añadió a favoritas"
                              : "añadió a pendientes"}
                          </span>{" "}
                          <span className="text-cine-accent">
                            {item.movie_title}
                          </span>
                        </p>
                        <p className="text-[11px] text-cine-muted">
                          {new Date(item.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      {item.rating && (
                        <span className="text-xs text-cine-gold font-bold flex-shrink-0">
                          ⭐ {item.rating}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Trending section */}
            <MovieRow
              title="🔥 Tendencias de la semana"
              movies={trending}
              loading={trendingLoading}
            />

            {/* Recommended for you */}
            <MovieRow
              title="🎯 Recomendadas para ti"
              movies={recommended}
              loading={recommendedLoading}
            />

            {/* Top rated of all time */}
            <MovieRow
              title="🏆 Mejores de todos los tiempos"
              movies={topRated}
              loading={topRatedLoading}
            />

            {/* Best animation */}
            <MovieRow
              title="✨ Mejores de animación"
              movies={animation}
              loading={animationLoading}
            />

            {/* Best suspense/thriller */}
            <MovieRow
              title="🔪 Mejores de suspense"
              movies={suspense}
              loading={suspenseLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Reusable horizontal movie row ── */
function MovieRow({ title, movies, loading }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {loading ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 md:w-44 aspect-[2/3] rounded-xl skeleton"
            />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <>
          {/* Horizontal scroll on mobile, grid on larger screens */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:hidden">
            {movies.map((m) => (
              <div key={m.tmdb_id} className="flex-shrink-0 w-36">
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((m) => (
              <MovieCard key={m.tmdb_id} movie={m} size="full" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
