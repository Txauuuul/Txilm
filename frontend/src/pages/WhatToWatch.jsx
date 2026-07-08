import { useState } from "react";
import {
  Shuffle,
  Film,
  Smile,
  Frown,
  Zap,
  Heart,
  Ghost,
  Rocket,
  Laugh,
  RefreshCw,
  Tv,
  Swords,
  Wand2,
  Brain,
} from "lucide-react";
import { Link } from "react-router-dom";
import { discoverMovies, getMovieDetail } from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const MOODS = [
  { id: "happy", label: "Alegre", emoji: "😄", Icon: Smile, genres: "35,10751", color: "bg-yellow-500/20 text-yellow-400 ring-yellow-500/30" },
  { id: "sad", label: "Melancólico", emoji: "😢", Icon: Frown, genres: "18,10749", color: "bg-blue-500/20 text-blue-400 ring-blue-500/30" },
  { id: "excited", label: "Adrenalina", emoji: "🔥", Icon: Zap, genres: "28,12", color: "bg-red-500/20 text-red-400 ring-red-500/30" },
  { id: "romantic", label: "Romántico", emoji: "❤️", Icon: Heart, genres: "10749,35", color: "bg-pink-500/20 text-pink-400 ring-pink-500/30" },
  { id: "scary", label: "Con miedo", emoji: "👻", Icon: Ghost, genres: "27,53", color: "bg-green-500/20 text-green-400 ring-green-500/30" },
  { id: "curious", label: "Intelectual", emoji: "🧠", Icon: Brain, genres: "99,36,9648", color: "bg-purple-500/20 text-purple-400 ring-purple-500/30" },
  { id: "chill", label: "Relajado", emoji: "😌", Icon: Laugh, genres: "35,16,10751", color: "bg-cyan-500/20 text-cyan-400 ring-cyan-500/30" },
  { id: "epic", label: "Épico", emoji: "⚔️", Icon: Swords, genres: "14,878,12", color: "bg-amber-500/20 text-amber-400 ring-amber-500/30" },
  { id: "magical", label: "Fantástico", emoji: "✨", Icon: Wand2, genres: "14,16", color: "bg-indigo-500/20 text-indigo-400 ring-indigo-500/30" },
  { id: "scifi", label: "Futurista", emoji: "🚀", Icon: Rocket, genres: "878,28", color: "bg-teal-500/20 text-teal-400 ring-teal-500/30" },
];

const PLATFORMS = [
  { id: "8", label: "Netflix", color: "bg-red-600" },
  { id: "337", label: "Disney+", color: "bg-blue-700" },
  { id: "119", label: "Prime", color: "bg-sky-600" },
  { id: "384", label: "HBO", color: "bg-purple-700" },
  { id: "2", label: "Apple TV+", color: "bg-gray-700" },
  { id: "149", label: "Movistar+", color: "bg-green-600" },
  { id: "531", label: "Paramount+", color: "bg-blue-600" },
  { id: "1899", label: "Max", color: "bg-indigo-700" },
  { id: "63", label: "Filmin", color: "bg-orange-600" },
];

const DECADES = [
  { id: "any", label: "Cualquiera", emoji: "🎬", from: null, to: null },
  { id: "new", label: "Recientes (2020+)", emoji: "🆕", from: 2020, to: 2029 },
  { id: "2010s", label: "2010s", emoji: "📱", from: 2010, to: 2019 },
  { id: "2000s", label: "2000s", emoji: "💿", from: 2000, to: 2009 },
  { id: "90s", label: "90s", emoji: "📼", from: 1990, to: 1999 },
  { id: "classic", label: "Clásicas", emoji: "🎞️", from: 1900, to: 1989 },
];

const RATING_LEVELS = [
  { id: "any", label: "Me da igual", emoji: "🤷", min: 0 },
  { id: "good", label: "Buena (7+)", emoji: "👍", min: 7 },
  { id: "great", label: "Muy buena (8+)", emoji: "🌟", min: 8 },
];

export default function WhatToWatch() {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [decade, setDecade] = useState(null);
  const [ratingLevel, setRatingLevel] = useState(null);
  const [result, setResult] = useState(null);
  const [faMinRating, setFaMinRating] = useState("");
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const togglePlatform = (id) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const totalSteps = 4;

  const findMovie = async () => {
    if (!mood) return;
    setLoading(true);
    setSpinning(true);
    setResult(null);

    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const params = {
        withGenres: mood.genres.split(",")[0],
        sortBy: "vote_average.desc",
        voteCountGte: ratingLevel?.min >= 8 ? 300 : 200,
        page: randomPage,
      };
      if (ratingLevel?.min > 0) params.voteAverageGte = ratingLevel.min;
      if (platforms.length > 0) {
        params.withWatchProviders = platforms.join("|");
        params.watchRegion = "ES";
      }

      let data = await discoverMovies(params);
      let items = Array.isArray(data) ? data : data.results || [];

      // Client-side decade filter
      if (decade?.from) {
        items = items.filter((m) => {
          const yr = parseInt(m.year);
          return yr >= decade.from && yr <= decade.to;
        });
      }

      // Fallback if no results
      if (items.length === 0) {
        const fallback = await discoverMovies({
          withGenres: mood.genres.split(",")[0],
          sortBy: "popularity.desc",
          voteCountGte: 100,
          page: 1,
          ...(platforms.length > 0
            ? { withWatchProviders: platforms.join("|"), watchRegion: "ES" }
            : {}),
        });
        items = Array.isArray(fallback) ? fallback : fallback.results || [];
      }

      // shuffle items
      items.sort(() => Math.random() - 0.5);

      const faMin = parseFloat(faMinRating);
      if (faMin > 0 && items.length > 0) {
        // Check FA score for candidates (max 10 to avoid too many calls)
        let found = null;
        for (const m of items.slice(0, 10)) {
          try {
            const detail = await getMovieDetail(m.tmdb_id, "ES");
            const faScore = parseFloat(detail?.scores?.filmaffinity?.score);
            if (!isNaN(faScore) && faScore >= faMin) {
              found = { ...m, faScore };
              break;
            }
          } catch { /* skip */ }
        }
        if (found) setResult(found);
      } else if (items.length > 0) {
        setResult(items[0]);
      }
    } catch {
      setResult(null);
    }

    setTimeout(() => {
      setSpinning(false);
      setLoading(false);
    }, 1500);
  };

  const reset = () => {
    setStep(1);
    setMood(null);
    setPlatforms([]);
    setDecade(null);
    setRatingLevel(null);
    setFaMinRating("");
    setResult(null);
  };

  const posterUrl = result?.poster
    ? result.poster.startsWith("http")
      ? result.poster
      : `${TMDB_IMG}/w500${result.poster}`
    : null;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <Shuffle className="w-6 h-6 text-cine-accent" /> ¿Qué veo?
          </h1>
          <p className="text-cine-muted text-sm mt-1">
            Responde unas preguntas y te sugiero la peli perfecta
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 mt-4">
        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i < step ? "bg-cine-accent" : "bg-cine-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Mood */}
        {step >= 1 && (
          <div
            className={`mb-6 ${step > 1 ? "opacity-60" : ""} transition-opacity`}
          >
            <h2 className="text-sm font-bold text-cine-muted mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cine-accent text-black text-xs font-bold flex items-center justify-center">
                1
              </span>
              ¿Qué tipo de peli te apetece?
            </h2>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMood(m);
                    if (step === 1) setStep(2);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl ring-1 transition text-center ${
                    mood?.id === m.id
                      ? m.color
                      : "bg-cine-card ring-cine-border hover:ring-white/20"
                  }`}
                >
                  <span className="text-xl sm:text-2xl block">{m.emoji}</span>
                  <span className="text-[10px] sm:text-xs font-medium mt-1 block truncate">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Platforms */}
        {step >= 2 && (
          <div
            className={`mb-6 animate-fadeInUp ${step > 2 ? "opacity-60" : ""} transition-opacity`}
          >
            <h2 className="text-sm font-bold text-cine-muted mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cine-accent text-black text-xs font-bold flex items-center justify-center">
                2
              </span>
              ¿En qué plataformas?{" "}
              <span className="text-[10px] font-normal">(opcional)</span>
            </h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {PLATFORMS.map((p) => {
                const selected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ring-1 ${
                      selected
                        ? `${p.color} text-white ring-transparent`
                        : "bg-cine-card text-cine-muted ring-cine-border hover:text-white hover:ring-white/30"
                    }`}
                  >
                    <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(3)}
              className="mt-3 text-xs text-cine-accent hover:underline"
            >
              {platforms.length > 0
                ? `${platforms.length} seleccionadas — Siguiente →`
                : "Sin preferencia — Siguiente →"}
            </button>
          </div>
        )}

        {/* Step 3: Decade */}
        {step >= 3 && (
          <div
            className={`mb-6 animate-fadeInUp ${step > 3 ? "opacity-60" : ""} transition-opacity`}
          >
            <h2 className="text-sm font-bold text-cine-muted mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cine-accent text-black text-xs font-bold flex items-center justify-center">
                3
              </span>
              ¿De qué época?
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DECADES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDecade(d);
                    if (step === 3) setStep(4);
                  }}
                  className={`p-2 sm:p-3 rounded-xl ring-1 transition text-center ${
                    decade?.id === d.id
                      ? "bg-cine-accent/20 text-cine-accent ring-cine-accent/30"
                      : "bg-cine-card ring-cine-border hover:ring-white/20"
                  }`}
                >
                  <span className="text-lg sm:text-xl block">{d.emoji}</span>
                  <span className="text-[9px] sm:text-xs font-medium mt-0.5 block truncate">
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Rating */}
        {step >= 4 && (
          <div className="mb-6 animate-fadeInUp">
            <h2 className="text-sm font-bold text-cine-muted mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cine-accent text-black text-xs font-bold flex items-center justify-center">
                4
              </span>
              ¿Cómo de buena?
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {RATING_LEVELS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRatingLevel(r)}
                  className={`p-2.5 sm:p-3 rounded-xl ring-1 transition text-center ${
                    ratingLevel?.id === r.id
                      ? "bg-cine-gold/20 text-cine-gold ring-cine-gold/30"
                      : "bg-cine-card ring-cine-border hover:ring-white/20"
                  }`}
                >
                  <span className="text-xl sm:text-2xl block">{r.emoji}</span>
                  <span className="text-[10px] sm:text-xs font-medium mt-1 block">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            {/* FA minimum filter */}
            <div className="mt-3 bg-cine-card/50 rounded-xl ring-1 ring-cine-border p-3">
              <label className="text-[11px] text-cine-muted mb-1.5 flex items-center gap-1">
                🎬 Nota mínima en FilmAffinity <span className="text-[9px] text-cine-muted/60">(opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={faMinRating}
                  onChange={(e) => setFaMinRating(e.target.value)}
                  placeholder="Ej: 6.5"
                  className="w-24 px-2.5 py-1.5 bg-cine-bg rounded-lg ring-1 ring-cine-border text-sm text-white placeholder:text-cine-muted/50 focus:ring-cine-accent outline-none"
                />
                <span className="text-xs text-cine-muted">/ 10</span>
                {faMinRating && (
                  <button
                    onClick={() => setFaMinRating("")}
                    className="text-[10px] text-cine-accent hover:text-cine-accent/80 transition"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {faMinRating && parseFloat(faMinRating) > 0 && (
                <p className="text-[10px] text-cine-muted/70 mt-1">
                  Solo se mostrarán películas con ≥ {parseFloat(faMinRating).toFixed(1)} en FA (puede tardar un poco más)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Search button */}
        {mood && (
          <button
            onClick={findMovie}
            disabled={loading}
            className="w-full py-3 bg-cine-accent text-white rounded-xl text-sm font-bold hover:bg-cine-accent/90 transition disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            <Shuffle
              className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`}
            />
            {loading
              ? "Buscando..."
              : result
                ? "🎰 Girar otra vez"
                : "🎰 ¡Sorpréndeme!"}
          </button>
        )}

        {/* Spinning animation */}
        {spinning && (
          <div className="flex items-center justify-center py-16 animate-pulse">
            <div className="text-6xl animate-bounce">🎰</div>
          </div>
        )}

        {/* Result */}
        {result && !spinning && (
          <div className="animate-fadeInUp">
            <div className="bg-cine-card rounded-2xl ring-1 ring-cine-border overflow-hidden">
              <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                {/* Poster */}
                <Link
                  to={`/movie/${result.tmdb_id}`}
                  className="flex-shrink-0"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={result.title}
                      className="w-24 sm:w-36 rounded-xl shadow-lg ring-1 ring-white/10 hover:ring-cine-accent/50 transition"
                    />
                  ) : (
                    <div className="w-24 sm:w-36 aspect-[2/3] rounded-xl bg-cine-border flex items-center justify-center">
                      <Film className="w-8 h-8 text-cine-muted" />
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <Link
                    to={`/movie/${result.tmdb_id}`}
                    className="text-base sm:text-lg font-extrabold hover:text-cine-accent transition line-clamp-2"
                  >
                    {result.title}
                  </Link>
                  {result.year && (
                    <p className="text-sm text-cine-muted mt-0.5">
                      {result.year}
                    </p>
                  )}
                  {result.faScore > 0 && (
                    <p className="text-cine-blue text-sm font-bold mt-1">
                      🎬 FA: {result.faScore.toFixed(1)}/10
                    </p>
                  )}
                  {result.vote_average > 0 && (
                    <p className="text-cine-gold text-sm font-bold mt-1">
                      ⭐ TMDB: {result.vote_average?.toFixed(1)}/10
                    </p>
                  )}
                  {result.overview && (
                    <p className="text-xs text-cine-muted mt-2 line-clamp-3 sm:line-clamp-4">
                      {result.overview}
                    </p>
                  )}

                  <Link
                    to={`/movie/${result.tmdb_id}`}
                    className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-cine-accent text-white rounded-lg text-xs font-semibold hover:bg-cine-accent/90 transition"
                  >
                    <Film className="w-3.5 h-3.5" /> Ver detalles
                  </Link>
                </div>
              </div>
            </div>

            {/* Try again + Reset */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={findMovie}
                className="flex-1 py-2 text-sm text-cine-muted hover:text-cine-accent transition flex items-center justify-center gap-1.5 bg-cine-card rounded-xl ring-1 ring-cine-border"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Otra peli
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2 text-sm text-cine-muted hover:text-white transition flex items-center justify-center gap-1.5 bg-cine-card rounded-xl ring-1 ring-cine-border"
              >
                <Shuffle className="w-3.5 h-3.5" /> Empezar de nuevo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
