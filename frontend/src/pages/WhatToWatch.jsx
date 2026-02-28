import { useState } from "react";
import { Shuffle, Film, Clock, Smile, Frown, Zap, Heart, Ghost, Rocket, Laugh, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { discoverMovies } from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const MOODS = [
  { id: "happy", label: "Alegre", emoji: "😄", Icon: Smile, genres: "35,10751,16", color: "bg-yellow-500/20 text-yellow-400 ring-yellow-500/30" },
  { id: "sad", label: "Melancólico", emoji: "😢", Icon: Frown, genres: "18,10749", color: "bg-blue-500/20 text-blue-400 ring-blue-500/30" },
  { id: "excited", label: "Emocionado", emoji: "🔥", Icon: Zap, genres: "28,12,878", color: "bg-red-500/20 text-red-400 ring-red-500/30" },
  { id: "romantic", label: "Romántico", emoji: "❤️", Icon: Heart, genres: "10749,35", color: "bg-pink-500/20 text-pink-400 ring-pink-500/30" },
  { id: "scary", label: "Con miedo", emoji: "👻", Icon: Ghost, genres: "27,53", color: "bg-green-500/20 text-green-400 ring-green-500/30" },
  { id: "curious", label: "Curioso", emoji: "🚀", Icon: Rocket, genres: "878,99,36", color: "bg-purple-500/20 text-purple-400 ring-purple-500/30" },
  { id: "chill", label: "Relajado", emoji: "😌", Icon: Laugh, genres: "35,16,10751", color: "bg-cyan-500/20 text-cyan-400 ring-cyan-500/30" },
];

const TIME_OPTIONS = [
  { id: "short", label: "< 90 min", emoji: "⚡", maxRuntime: 90 },
  { id: "medium", label: "90-120 min", emoji: "🎥", maxRuntime: 120 },
  { id: "long", label: "120+ min", emoji: "🍿", maxRuntime: 999 },
  { id: "any", label: "Cualquiera", emoji: "🎬", maxRuntime: 999 },
];

export default function WhatToWatch() {
  const [mood, setMood] = useState(null);
  const [time, setTime] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const findMovie = async () => {
    if (!mood) return;
    setLoading(true);
    setSpinning(true);
    setResult(null);

    try {
      // Get a random page (1-5) for variety
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const data = await discoverMovies({
        withGenres: mood.genres.split(",")[0], // primary genre
        sortBy: "vote_average.desc",
        voteCountGte: 500,
        page: randomPage,
      });

      let items = Array.isArray(data) ? data : data.results || [];

      // If we have no results, try page 1
      if (items.length === 0) {
        const fallback = await discoverMovies({
          withGenres: mood.genres.split(",")[0],
          sortBy: "popularity.desc",
          voteCountGte: 200,
          page: 1,
        });
        items = Array.isArray(fallback) ? fallback : fallback.results || [];
      }

      if (items.length > 0) {
        // Pick a random movie from results
        const randomIdx = Math.floor(Math.random() * items.length);
        setResult(items[randomIdx]);
      }
    } catch {
      setResult(null);
    }

    // Simulate spinning animation
    setTimeout(() => {
      setSpinning(false);
      setLoading(false);
    }, 1500);
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
            Dime cómo te sientes y te sugiero una película
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {/* Step 1: Mood */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-cine-muted mb-3">1. ¿Cómo te sientes?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m)}
                className={`p-3 rounded-xl ring-1 transition text-center ${
                  mood?.id === m.id
                    ? m.color
                    : "bg-cine-card ring-cine-border hover:ring-white/20"
                }`}
              >
                <span className="text-2xl block">{m.emoji}</span>
                <span className="text-xs font-medium mt-1 block">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Time (optional) */}
        {mood && (
          <div className="mb-6 animate-fadeInUp">
            <h2 className="text-sm font-bold text-cine-muted mb-3">2. ¿Cuánto tiempo tienes? (opcional)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTime(t)}
                  className={`p-3 rounded-xl ring-1 transition text-center ${
                    time?.id === t.id
                      ? "bg-cine-accent/20 text-cine-accent ring-cine-accent/30"
                      : "bg-cine-card ring-cine-border hover:ring-white/20"
                  }`}
                >
                  <span className="text-xl block">{t.emoji}</span>
                  <span className="text-xs font-medium mt-1 block">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spin button */}
        {mood && (
          <button
            onClick={findMovie}
            disabled={loading}
            className="w-full py-3 bg-cine-accent text-white rounded-xl text-sm font-bold hover:bg-cine-accent/90 transition disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
          >
            <Shuffle className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} />
            {loading ? "Buscando..." : result ? "Girar otra vez" : "¡Sorpréndeme!"}
          </button>
        )}

        {/* Result */}
        {spinning && (
          <div className="flex items-center justify-center py-16 animate-pulse">
            <div className="text-6xl animate-bounce">🎰</div>
          </div>
        )}

        {result && !spinning && (
          <div className="animate-fadeInUp">
            <div className="bg-cine-card rounded-2xl ring-1 ring-cine-border overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Poster */}
                <Link to={`/movie/${result.tmdb_id}`} className="flex-shrink-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={result.title}
                      className="w-28 sm:w-36 rounded-xl shadow-lg ring-1 ring-white/10 hover:ring-cine-accent/50 transition"
                    />
                  ) : (
                    <div className="w-28 sm:w-36 aspect-[2/3] rounded-xl bg-cine-border flex items-center justify-center">
                      <Film className="w-8 h-8 text-cine-muted" />
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <Link
                    to={`/movie/${result.tmdb_id}`}
                    className="text-lg font-extrabold hover:text-cine-accent transition line-clamp-2"
                  >
                    {result.title}
                  </Link>
                  {result.year && (
                    <p className="text-sm text-cine-muted mt-0.5">{result.year}</p>
                  )}
                  {result.vote_average > 0 && (
                    <p className="text-cine-gold text-sm font-bold mt-1">
                      ⭐ {result.vote_average?.toFixed(1)}/10
                    </p>
                  )}
                  {result.overview && (
                    <p className="text-xs text-cine-muted mt-2 line-clamp-4">
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

            {/* Try again */}
            <button
              onClick={findMovie}
              className="mt-3 w-full py-2 text-sm text-cine-muted hover:text-cine-accent transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> No me convence, otra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
