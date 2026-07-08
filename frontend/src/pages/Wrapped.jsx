import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Calendar, Film, Clock, MessageSquare, Flame, TrendingUp } from "lucide-react";
import { getWrapped } from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";
function imgUrl(p, s = "w154") {
  if (!p) return null;
  return p.startsWith("http") ? p : `${TMDB_IMG}/${s}${p}`;
}

export default function Wrapped() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed, 11 = December
  const isDecember = currentMonth === 11;
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!isDecember) return;
    setLoading(true);
    setSlide(0);
    getWrapped(year)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, isDecember]);

  const slides = data && !data.empty ? [
    // Slide 0: Hero
    {
      bg: "from-purple-900 via-indigo-900 to-cine-bg",
      content: (
        <div className="text-center">
          <p className="text-5xl sm:text-6xl mb-4">🎬</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-2">Tu {year}</h2>
          <h3 className="text-lg sm:text-xl text-cine-muted">en películas</h3>
          <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-black text-cine-accent">{data.total_movies}</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Películas vistas</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-black text-cine-gold">{data.estimated_hours}h</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Horas estimadas</p>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 1: Top genre
    {
      bg: "from-emerald-900 via-teal-900 to-cine-bg",
      content: (
        <div className="text-center">
          <p className="text-5xl sm:text-6xl mb-4">🎭</p>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Tu género favorito</h2>
          <p className="text-3xl sm:text-4xl font-black text-cine-accent mt-4">{data.top_genre}</p>
          {data.top_genres?.length > 0 && (
            <div className="mt-6 space-y-2">
              {data.top_genres.map(({ genre, count }, i) => (
                <div key={genre} className="flex items-center gap-3">
                  <span className="text-sm text-cine-muted w-6 text-right">#{i + 1}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cine-accent to-emerald-500 rounded-full flex items-center px-3"
                      style={{ width: `${(count / data.top_genres[0].count) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-black truncate">{genre}</span>
                    </div>
                  </div>
                  <span className="text-sm text-cine-muted w-8">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    // Slide 2: Best & Worst
    {
      bg: "from-amber-900 via-orange-900 to-cine-bg",
      content: (
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tus extremos</h2>
          <div className="space-y-3 sm:space-y-4">
            {data.best_movie && (
              <Link to={`/movie/${data.best_movie.tmdb_id}`} className="flex items-center gap-3 sm:gap-4 bg-white/5 rounded-2xl p-3 sm:p-4 hover:bg-white/10 transition">
                {data.best_movie.poster && (
                  <img src={imgUrl(data.best_movie.poster)} alt="" className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl object-cover shrink-0" />
                )}
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs text-cine-green mb-1">⬆️ Tu favorita</p>
                  <p className="font-bold text-sm sm:text-base truncate">{data.best_movie.title}</p>
                  <p className="text-cine-gold flex items-center gap-1 mt-1">
                    <Star size={14} fill="currentColor" /> {data.best_movie.rating}
                  </p>
                </div>
              </Link>
            )}
            {data.worst_movie && (
              <Link to={`/movie/${data.worst_movie.tmdb_id}`} className="flex items-center gap-3 sm:gap-4 bg-white/5 rounded-2xl p-3 sm:p-4 hover:bg-white/10 transition">
                {data.worst_movie.poster && (
                  <img src={imgUrl(data.worst_movie.poster)} alt="" className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl object-cover shrink-0" />
                )}
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs text-red-400 mb-1">⬇️ Tu menos favorita</p>
                  <p className="font-bold text-sm sm:text-base truncate">{data.worst_movie.title}</p>
                  <p className="text-cine-gold flex items-center gap-1 mt-1">
                    <Star size={14} fill="currentColor" /> {data.worst_movie.rating}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      ),
    },
    // Slide 3: Monthly chart
    {
      bg: "from-blue-900 via-sky-900 to-cine-bg",
      content: (
        <div className="text-center">
          <p className="text-5xl sm:text-6xl mb-4">📅</p>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Tu año mes a mes</h2>
          <p className="text-xs sm:text-sm text-cine-muted mb-4 sm:mb-6">
            Tu mes más activo: <span className="text-cine-accent font-bold">{data.busiest_month}</span> ({data.busiest_month_count} pelis)
          </p>
          <div className="flex items-end justify-between gap-0.5 sm:gap-1 h-24 sm:h-32">
            {data.monthly_data?.map(({ month, count }) => {
              const maxCount = Math.max(...data.monthly_data.map(m => m.count), 1);
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-cine-muted">{count || ""}</span>
                  <div
                    className="w-full bg-gradient-to-t from-cine-accent to-sky-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count ? "8px" : "2px" }}
                  />
                  <span className="text-[9px] text-cine-muted">{month}</span>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    // Slide 4: Stats summary
    {
      bg: "from-rose-900 via-pink-900 to-cine-bg",
      content: (
        <div className="text-center">
          <p className="text-5xl sm:text-6xl mb-4">📊</p>
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Resumen {year}</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <Star className="mx-auto mb-1 sm:mb-2 text-cine-gold" size={20} />
              <p className="text-xl sm:text-2xl font-black">{data.avg_rating || "—"}</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Media de rating</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <Flame className="mx-auto mb-1 sm:mb-2 text-orange-400" size={20} />
              <p className="text-xl sm:text-2xl font-black">{data.max_streak}</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Mejor racha (días)</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <MessageSquare className="mx-auto mb-1 sm:mb-2 text-cine-accent" size={20} />
              <p className="text-xl sm:text-2xl font-black">{data.total_reviews}</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Reseñas escritas</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4">
              <TrendingUp className="mx-auto mb-1 sm:mb-2 text-cine-green" size={20} />
              <p className="text-xl sm:text-2xl font-black">{data.total_ratings}</p>
              <p className="text-[10px] sm:text-xs text-cine-muted">Valoraciones</p>
            </div>
          </div>
        </div>
      ),
    },
  ] : [];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 md:pt-20 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/profile" className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5 shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">Tu Wrapped</h1>
          <p className="text-sm text-cine-muted">Resumen anual de tu cine</p>
        </div>
        {/* Year selector — only in December */}
        {isDecember && (
          <div className="flex items-center gap-2 bg-cine-card border border-cine-border rounded-xl px-3 py-1.5 shrink-0">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-0.5 hover:text-cine-accent transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-sm min-w-[40px] text-center">{year}</span>
            <button
              onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
              disabled={year >= currentYear}
              className="p-0.5 hover:text-cine-accent transition disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Not December — teaser */}
      {!isDecember ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-6">🎁</p>
          <h2 className="text-2xl font-black mb-3">Tu Wrapped llega en diciembre</h2>
          <p className="text-cine-muted max-w-sm mx-auto">
            Cuando llegue diciembre, aquí verás un resumen épico de todo tu año en cine:
            películas vistas, géneros favoritos, rachas y mucho más.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 ring-1 ring-cine-border text-sm text-cine-muted">
            <Calendar size={16} className="text-cine-accent" />
            Faltan {(() => {
              const now = new Date();
              const dec = new Date(now.getFullYear(), 11, 1);
              if (dec < now) dec.setFullYear(dec.getFullYear() + 1);
              return Math.ceil((dec - now) / 86400000);
            })()} días para diciembre
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cine-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.empty ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🫗</p>
          <p className="text-cine-muted text-lg">No hay datos para {year}</p>
          <p className="text-cine-muted text-sm mt-2">Necesitas haber visto películas durante ese año</p>
        </div>
      ) : (
        <>
          {/* Slide view */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b border border-cine-border min-h-[380px] sm:min-h-[420px]">
            <div className={`absolute inset-0 bg-gradient-to-b ${slides[slide]?.bg || "from-cine-bg to-cine-bg"} transition-all duration-500`} />
            <div className="relative z-10 p-4 sm:p-6 flex flex-col justify-center min-h-[380px] sm:min-h-[420px] overflow-y-auto">
              {slides[slide]?.content}
            </div>
          </div>

          {/* Dots + navigation */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
              disabled={slide === 0}
              className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5 disabled:opacity-30 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === slide ? "bg-cine-accent w-6" : "bg-cine-muted/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}
              disabled={slide >= slides.length - 1}
              className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5 disabled:opacity-30 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
