import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { getUpcoming } from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";
function imgUrl(p, s = "w154") {
  if (!p) return null;
  return p.startsWith("http") ? p : `${TMDB_IMG}/${s}${p}`;
}

const GENRE_MAP = {
  28: "Acción", 16: "Animación", 12: "Aventura", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 14: "Fantasía", 27: "Terror", 10749: "Romance",
  878: "Sci-Fi", 53: "Suspense", 10751: "Familia", 36: "Historia",
  10402: "Música", 9648: "Misterio", 10752: "Bélica", 37: "Western",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((target - now) / 86400000);
  if (diff < 0) return "Estrenada";
  if (diff === 0) return "¡Hoy!";
  if (diff === 1) return "Mañana";
  return `En ${diff} días`;
}

export default function Upcoming() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [region, setRegion] = useState("ES");
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    getUpcoming(region, page)
      .then((data) => {
        setMovies(data.results || []);
        setTotalPages(data.total_pages || 1);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [region, page]);

  // Group movies by week
  const grouped = {};
  movies.forEach((m) => {
    if (!m.release_date) return;
    const d = new Date(m.release_date + "T00:00:00");
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const key = monday.toISOString().slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const sortedWeeks = Object.keys(grouped).sort();

  const REGIONS = [
    { code: "ES", label: "🇪🇸 España" },
    { code: "US", label: "🇺🇸 EE.UU." },
    { code: "MX", label: "🇲🇽 México" },
    { code: "AR", label: "🇦🇷 Argentina" },
    { code: "GB", label: "🇬🇧 Reino Unido" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 md:pt-20 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-cine-accent" size={24} />
            Próximos estrenos
          </h1>
          <p className="text-sm text-cine-muted">Calendario de lanzamientos</p>
        </div>
      </div>

      {/* Region selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {REGIONS.map((r) => (
          <button
            key={r.code}
            onClick={() => { setRegion(r.code); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              region === r.code
                ? "bg-cine-accent text-black"
                : "bg-cine-card border border-cine-border text-cine-muted hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cine-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-cine-muted">No se encontraron próximos estrenos</p>
        </div>
      ) : (
        <>
          {sortedWeeks.map((weekKey) => {
            const weekDate = new Date(weekKey + "T00:00:00");
            const weekEnd = new Date(weekDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekLabel = `${weekDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;

            return (
              <div key={weekKey} className="mb-8">
                <h2 className="text-sm font-bold text-cine-accent mb-3 uppercase tracking-wider">
                  📅 Semana del {weekLabel}
                </h2>
                <div className="space-y-3">
                  {grouped[weekKey].map((m) => {
                    const countdown = daysUntil(m.release_date);
                    const isToday = countdown === "¡Hoy!";
                    return (
                      <Link
                        key={m.tmdb_id}
                        to={`/movie/${m.tmdb_id}`}
                        className={`flex gap-4 bg-cine-card border rounded-2xl p-3 hover:border-cine-accent/40 transition ${
                          isToday ? "border-cine-accent/50 ring-1 ring-cine-accent/20" : "border-cine-border"
                        }`}
                      >
                        {m.poster ? (
                          <img src={imgUrl(m.poster)} alt="" className="w-16 h-24 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-24 rounded-xl bg-cine-bg flex items-center justify-center shrink-0">
                            <Calendar size={20} className="text-cine-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{m.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-cine-muted">{formatDate(m.release_date)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isToday ? "bg-cine-accent text-black" : "bg-white/5 text-cine-muted"
                            }`}>
                              {countdown}
                            </span>
                          </div>
                          {m.genre_ids?.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {m.genre_ids.slice(0, 3).map((gid) => (
                                <span key={gid} className="text-[10px] bg-white/5 text-cine-muted px-2 py-0.5 rounded-full">
                                  {GENRE_MAP[gid] || gid}
                                </span>
                              ))}
                            </div>
                          )}
                          {m.overview && (
                            <p className="text-xs text-cine-muted mt-2 line-clamp-2">{m.overview}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-cine-muted">
              Página {page} de {Math.min(totalPages, 10)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages, 10))}
              disabled={page >= Math.min(totalPages, 10)}
              className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
