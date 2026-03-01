import { Link } from "react-router-dom";

const NO_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%2314141f'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234a4a5e' font-size='16'%3ESin póster%3C/text%3E%3C/svg%3E";

export default function MovieCard({ movie, size = "md" }) {
  const w = size === "full" ? "w-full" : size === "lg" ? "w-44" : size === "sm" ? "w-28" : "w-36";
  const score = movie.vote_average;

  return (
    <Link
      to={`/movie/${movie.tmdb_id}`}
      className={`${w} flex-shrink-0 group`}
    >
      <div className="relative overflow-hidden rounded-xl shadow-lg shadow-black/40 ring-1 ring-white/5 transition-transform duration-300 group-hover:scale-105">
        <img
          src={movie.poster || NO_POSTER}
          alt={movie.title}
          loading="lazy"
          className="w-full aspect-[2/3] object-cover"
        />
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* Score badge */}
        {score > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-0.5 ring-1 ring-white/10">
            <span className="text-[10px]">⭐</span>
            <span className="text-[11px] font-bold text-cine-gold">
              {typeof score === "number" ? score.toFixed(1) : score}
            </span>
          </div>
        )}
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-tight line-clamp-2 text-white/90 group-hover:text-white transition-colors">
        {movie.title}
      </h3>
      <p className="text-xs text-cine-muted mt-0.5">{movie.year}</p>
    </Link>
  );
}
