import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { searchMovies, getTrending } from "../api/api";
import MovieCard from "../components/MovieCard";
import Logo from "../components/Logo";
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
  const { country, setCountry } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [showCountry, setShowCountry] = useState(false);
  const debounceRef = useRef(null);
  const countryRef = useRef(null);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target))
        setShowCountry(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch trending on mount
  useEffect(() => {
    setTrendingLoading(true);
    getTrending("week", 1)
      .then((data) => setTrending(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

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
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero / Header */}
      <section className="relative overflow-hidden px-4 pt-6 pb-4 md:pt-10 md:pb-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" className="text-cine-accent" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            <span className="text-white">Txilms</span>
          </h1>
          <p className="text-cine-muted mt-2 text-sm md:text-base">
            Todas las puntuaciones de tus películas en un solo lugar
          </p>
        </div>
      </section>

      {/* Search bar + country */}
      <section className="sticky top-0 md:top-16 z-30 bg-cine-bg/80 backdrop-blur-lg border-b border-cine-border px-4 py-3">
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
          /* Trending section */
          <section>
            <h2 className="text-lg font-bold mb-4">
              🔥 Tendencias de la semana
            </h2>
            {trendingLoading ? (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-36 md:w-44 aspect-[2/3] rounded-xl skeleton"
                  />
                ))}
              </div>
            ) : (
              <>
                {/* Horizontal scroll on mobile, grid on larger screens */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:hidden">
                  {trending.map((m) => (
                    <div key={m.tmdb_id} className="flex-shrink-0 w-36">
                      <MovieCard movie={m} />
                    </div>
                  ))}
                </div>
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {trending.map((m) => (
                    <MovieCard key={m.tmdb_id} movie={m} size="full" />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
