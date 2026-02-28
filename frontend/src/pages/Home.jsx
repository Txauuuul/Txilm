import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronDown, Clock, SlidersHorizontal, Filter } from "lucide-react";
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

const GENRES = [
  { id: "", label: "Todos" },
  { id: "28", label: "Acción" },
  { id: "16", label: "Animación" },
  { id: "12", label: "Aventura" },
  { id: "35", label: "Comedia" },
  { id: "80", label: "Crimen" },
  { id: "99", label: "Documental" },
  { id: "18", label: "Drama" },
  { id: "14", label: "Fantasía" },
  { id: "27", label: "Terror" },
  { id: "10749", label: "Romance" },
  { id: "878", label: "Sci-Fi" },
  { id: "53", label: "Suspense" },
];

const DECADES = [
  { label: "Cualquier año", from: "", to: "" },
  { label: "2020s", from: "2020", to: "2029" },
  { label: "2010s", from: "2010", to: "2019" },
  { label: "2000s", from: "2000", to: "2009" },
  { label: "90s", from: "1990", to: "1999" },
  { label: "80s", from: "1980", to: "1989" },
  { label: "Clásicas (<1980)", from: "1900", to: "1979" },
];

const PLATFORMS = [
  { id: "8", label: "Netflix", color: "bg-red-600" },
  { id: "337", label: "Disney+", color: "bg-blue-700" },
  { id: "119", label: "Prime Video", color: "bg-sky-600" },
  { id: "384", label: "HBO Max", color: "bg-purple-700" },
  { id: "2", label: "Apple TV+", color: "bg-gray-700" },
  { id: "149", label: "Movistar+", color: "bg-green-600" },
  { id: "350", label: "Apple TV", color: "bg-gray-600" },
  { id: "531", label: "Paramount+", color: "bg-blue-600" },
  { id: "1899", label: "Max", color: "bg-indigo-700" },
  { id: "63", label: "Filmin", color: "bg-orange-600" },
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularidad" },
  { value: "rating", label: "Mejor valoradas" },
  { value: "date_desc", label: "Más recientes" },
  { value: "date_asc", label: "Más antiguas" },
];

const HISTORY_KEY = "txilms-search-history";
const MAX_HISTORY = 8;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveToHistory(term) {
  if (!term.trim()) return;
  let history = getSearchHistory().filter((h) => h !== term.trim());
  history.unshift(term.trim());
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function removeFromHistory(term) {
  const history = getSearchHistory().filter((h) => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

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
  const [comedy, setComedy] = useState([]);
  const [comedyLoading, setComedyLoading] = useState(true);
  const [action, setAction] = useState([]);
  const [actionLoading, setActionLoading] = useState(true);
  const [horror, setHorror] = useState([]);
  const [horrorLoading, setHorrorLoading] = useState(true);
  const [scifi, setScifi] = useState([]);
  const [scifiLoading, setScifiLoading] = useState(true);
  const [drama, setDrama] = useState([]);
  const [dramaLoading, setDramaLoading] = useState(true);

  // Search filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterGenre, setFilterGenre] = useState("");
  const [filterDecade, setFilterDecade] = useState(0); // index into DECADES
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterProviders, setFilterProviders] = useState([]);
  const [filterSort, setFilterSort] = useState("popularity");
  const [filterResults, setFilterResults] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Search history
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef(null);

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

    // Comedy (genre 35)
    setComedyLoading(true);
    discoverMovies({ withGenres: "35", sortBy: "vote_average.desc", voteCountGte: 500 })
      .then((data) => setComedy(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setComedyLoading(false));

    // Action (genre 28)
    setActionLoading(true);
    discoverMovies({ withGenres: "28", sortBy: "vote_average.desc", voteCountGte: 500 })
      .then((data) => setAction(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setActionLoading(false));

    // Horror (genre 27)
    setHorrorLoading(true);
    discoverMovies({ withGenres: "27", sortBy: "vote_average.desc", voteCountGte: 300 })
      .then((data) => setHorror(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setHorrorLoading(false));

    // Sci-Fi (genre 878)
    setScifiLoading(true);
    discoverMovies({ withGenres: "878", sortBy: "vote_average.desc", voteCountGte: 300 })
      .then((data) => setScifi(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setScifiLoading(false));

    // Drama (genre 18)
    setDramaLoading(true);
    discoverMovies({ withGenres: "18", sortBy: "vote_average.desc", voteCountGte: 1000 })
      .then((data) => setDrama(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setDramaLoading(false));
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
      setShowHistory(false);
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
          saveToHistory(value.trim());
          setSearchHistory(getSearchHistory());
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [country]
  );

  // Filter search
  const applyFilters = useCallback(async () => {
    setFilterLoading(true);
    setIsFilterActive(true);
    try {
      const decade = DECADES[filterDecade];
      const sortByMap = {
        popularity: "popularity.desc",
        rating: "vote_average.desc",
        date_desc: "primary_release_date.desc",
        date_asc: "primary_release_date.asc",
      };
      const params = {
        sortBy: sortByMap[filterSort] || "popularity.desc",
        voteCountGte: filterSort === "rating" ? 200 : 100,
      };
      if (filterGenre) params.withGenres = filterGenre;
      if (filterMinRating > 0) params.voteAverageGte = filterMinRating;
      if (filterProviders.length > 0) {
        params.withWatchProviders = filterProviders.join("|");
        params.watchRegion = "ES";
      }
      const data = await discoverMovies(params);
      let items = Array.isArray(data) ? data : data.results || [];
      // Client-side year filtering since TMDB discover doesn't have year range
      if (decade.from) {
        items = items.filter((m) => {
          const yr = parseInt(m.year);
          return yr >= parseInt(decade.from) && yr <= parseInt(decade.to);
        });
      }
      // Client-side sort for rating/date (in case TMDB sort differs)
      if (filterSort === "rating") {
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      } else if (filterSort === "date_desc") {
        items.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
      } else if (filterSort === "date_asc") {
        items.sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
      }
      setFilterResults(items);
    } catch {
      setFilterResults([]);
    } finally {
      setFilterLoading(false);
    }
  }, [filterGenre, filterDecade, filterMinRating, filterProviders, filterSort]);

  const clearFilters = () => {
    setFilterGenre("");
    setFilterDecade(0);
    setFilterMinRating(0);
    setFilterProviders([]);
    setFilterSort("popularity");
    setIsFilterActive(false);
    setFilterResults([]);
    setShowFilters(false);
  };

  const toggleProvider = (id) => {
    setFilterProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

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

      {/* Search bar + country + filters */}
      <section className="sticky sticky-safe z-30 bg-cine-bg/80 backdrop-blur-lg border-b border-cine-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cine-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar película o serie…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => !query.trim() && searchHistory.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
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

            {/* Search history dropdown */}
            {showHistory && searchHistory.length > 0 && !query.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-cine-card rounded-xl ring-1 ring-cine-border shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-cine-border">
                  <span className="text-[11px] text-cine-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Búsquedas recientes
                  </span>
                </div>
                {searchHistory.map((term) => (
                  <div
                    key={term}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-cine-border/40 transition cursor-pointer"
                  >
                    <button
                      className="flex-1 text-left text-sm text-white"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSearch(term);
                      }}
                    >
                      {term}
                    </button>
                    <button
                      className="text-cine-muted hover:text-cine-accent transition p-0.5"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        removeFromHistory(term);
                        setSearchHistory(getSearchHistory());
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm ring-1 transition ${
              isFilterActive || showFilters
                ? "bg-cine-accent/10 ring-cine-accent text-cine-accent"
                : "bg-cine-card ring-cine-border hover:ring-cine-accent text-cine-muted"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

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

        {/* Filter panel */}
        {showFilters && (
          <div className="max-w-3xl mx-auto mt-3 bg-cine-card rounded-xl ring-1 ring-cine-border p-4 animate-fadeInUp">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-cine-accent" /> Filtros avanzados
              </h3>
              {isFilterActive && (
                <button onClick={clearFilters} className="text-xs text-cine-accent hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Genre filter */}
              <div>
                <label className="text-[11px] text-cine-muted block mb-1">Género</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full bg-cine-bg rounded-lg px-3 py-2 text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                >
                  {GENRES.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>

              {/* Decade filter */}
              <div>
                <label className="text-[11px] text-cine-muted block mb-1">Época</label>
                <select
                  value={filterDecade}
                  onChange={(e) => setFilterDecade(Number(e.target.value))}
                  className="w-full bg-cine-bg rounded-lg px-3 py-2 text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                >
                  {DECADES.map((d, i) => (
                    <option key={i} value={i}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort filter */}
              <div>
                <label className="text-[11px] text-cine-muted block mb-1">Ordenar por</label>
                <select
                  value={filterSort}
                  onChange={(e) => setFilterSort(e.target.value)}
                  className="w-full bg-cine-bg rounded-lg px-3 py-2 text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Min rating slider (decimal) */}
            <div className="mt-3">
              <label className="text-[11px] text-cine-muted block mb-1">
                Nota mínima: {filterMinRating > 0 ? `${Number(filterMinRating).toFixed(1)}+` : "Cualquiera"}
              </label>
              <input
                type="range"
                min="0"
                max="9"
                step="0.5"
                value={filterMinRating}
                onChange={(e) => setFilterMinRating(Number(e.target.value))}
                className="w-full accent-cine-accent"
              />
            </div>

            {/* Streaming platform multi-select */}
            <div className="mt-3">
              <label className="text-[11px] text-cine-muted block mb-1.5">
                Plataformas {filterProviders.length > 0 && `(${filterProviders.length})`}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const selected = filterProviders.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProvider(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ring-1 ${
                        selected
                          ? `${p.color} text-white ring-transparent`
                          : "bg-cine-bg text-cine-muted ring-cine-border hover:text-white hover:ring-white/30"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={applyFilters}
              className="mt-3 w-full py-2 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition"
            >
              Buscar con filtros
            </button>
          </div>
        )}
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
        ) : isFilterActive ? (
          /* Filter results */
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Filter className="w-5 h-5 text-cine-accent" />
                Resultados filtrados
                <span className="text-sm text-cine-muted font-normal">
                  ({filterResults.length} películas)
                </span>
              </h2>
              <button onClick={clearFilters} className="text-sm text-cine-accent hover:underline">
                Limpiar
              </button>
            </div>
            {filterLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
                ))}
              </div>
            ) : filterResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filterResults.map((m) => (
                  <MovieCard key={m.tmdb_id} movie={m} size="full" />
                ))}
              </div>
            ) : (
              <p className="text-cine-muted text-center py-12">
                No se encontraron películas con esos filtros
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

            {/* Comedy */}
            <MovieRow
              title="😂 Mejores comedias"
              movies={comedy}
              loading={comedyLoading}
            />

            {/* Action */}
            <MovieRow
              title="💥 Mejores de acción"
              movies={action}
              loading={actionLoading}
            />

            {/* Drama */}
            <MovieRow
              title="🎭 Mejores dramas"
              movies={drama}
              loading={dramaLoading}
            />

            {/* Horror */}
            <MovieRow
              title="👻 Mejores de terror"
              movies={horror}
              loading={horrorLoading}
            />

            {/* Sci-Fi */}
            <MovieRow
              title="🚀 Mejores de ciencia ficción"
              movies={scifi}
              loading={scifiLoading}
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
