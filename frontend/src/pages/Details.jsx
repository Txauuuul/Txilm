import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Eye,
  ExternalLink,
  Clock,
  Calendar,
  Film,
  Send,
  Star,
} from "lucide-react";
import { getMovieDetail, getMovieRatings } from "../api/api";
import useColorExtractor from "../hooks/useColorExtractor";
import ScoreCard from "../components/ScoreCard";
import ShareModal from "../components/ShareModal";
import RatingModal from "../components/RatingModal";
import useStore from "../store/useStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w500") {
  if (!path) return null;
  // Backend may return full URL or just a path
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function Details() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [friendRatings, setFriendRatings] = useState([]);

  const {
    country,
    isFavorite,
    toggleFavorite,
    isInWatchlist,
    toggleWatchlist,
    isWatched,
    addToWatched,
    removeFromWatched,
    fetchLists,
    listsLoaded,
  } = useStore();

  const posterUrl = imgUrl(movie?.poster, "w500");
  const backdropUrl = imgUrl(movie?.backdrop, "w1280");

  const dominantColor = useColorExtractor(posterUrl);

  useEffect(() => {
    if (!listsLoaded) fetchLists();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMovieDetail(id, country)
      .then(setMovie)
      .catch(() => setError("No se pudo cargar la película"))
      .finally(() => setLoading(false));

    // Load friend ratings
    getMovieRatings(id).then(setFriendRatings).catch(() => {});
  }, [id, country]);

  /* ───── loading skeleton ───── */
  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="h-[340px] md:h-[420px] skeleton" />
        <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10 space-y-4">
          <div className="flex gap-4">
            <div className="w-36 md:w-48 aspect-[2/3] rounded-xl skeleton flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-4">
              <div className="h-7 w-3/4 skeleton rounded" />
              <div className="h-4 w-1/2 skeleton rounded" />
              <div className="h-4 w-1/3 skeleton rounded" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-cine-muted text-lg">{error || "Película no encontrada"}</p>
        <Link to="/" className="text-cine-accent hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  const scores = movie.scores || {};
  const providers = movie.watch_providers || {};

  const miniMovie = {
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    poster: movie.poster,
    year: movie.year,
    vote_average: scores.imdb?.score || null,
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* ───── backdrop hero ───── */}
      <div className="relative h-[340px] md:h-[420px] overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* gradient overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${dominantColor} 0%, rgba(10,10,15,0.7) 50%, #0a0a0f 100%)`,
          }}
        />
        {/* back button */}
        <Link
          to="/"
          className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-black/40 backdrop-blur rounded-full px-3 py-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>

      {/* ───── main content ───── */}
      <div className="max-w-4xl mx-auto px-4 -mt-36 md:-mt-44 relative z-10">
        {/* poster + meta row */}
        <div className="flex gap-4 md:gap-6">
          {/* poster */}
          <div className="flex-shrink-0 w-32 md:w-48">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="w-full aspect-[2/3] rounded-xl bg-cine-card flex items-center justify-center text-cine-muted">
                <Film className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* title + metadata */}
          <div className="flex-1 pt-2 md:pt-6 min-w-0">
            <h1 className="text-xl md:text-3xl font-extrabold leading-tight line-clamp-3">
              {movie.title}
            </h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-cine-muted text-xs md:text-sm mt-0.5 italic line-clamp-1">
                {movie.original_title}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs md:text-sm text-cine-muted">
              {movie.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {movie.year}
                </span>
              )}
              {movie.runtime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {movie.runtime} min
                </span>
              )}
              {movie.rated && movie.rated !== "N/A" && (
                <span className="px-1.5 py-0.5 rounded bg-cine-card ring-1 ring-cine-border text-[11px] font-semibold">
                  {movie.rated}
                </span>
              )}
            </div>

            {/* genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 bg-cine-card rounded-full text-[11px] text-cine-muted ring-1 ring-cine-border"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {movie.director && (
              <p className="text-xs text-cine-muted mt-2">
                Dirección: <span className="text-white font-medium">{movie.director}</span>
              </p>
            )}

            {/* action buttons */}
            <div className="flex gap-2 mt-3">
              <ActionBtn
                active={isFavorite(movie.tmdb_id)}
                onClick={() => toggleFavorite(miniMovie)}
                Icon={Heart}
                label="Favorita"
                activeColor="text-cine-accent"
              />
              <ActionBtn
                active={isInWatchlist(movie.tmdb_id)}
                onClick={() => toggleWatchlist(miniMovie)}
                Icon={Bookmark}
                label="Pendiente"
                activeColor="text-cine-gold"
              />
              <ActionBtn
                active={isWatched(movie.tmdb_id)}
                onClick={() => {
                  if (isWatched(movie.tmdb_id)) {
                    removeFromWatched(movie.tmdb_id);
                  } else {
                    setShowRating(true);
                  }
                }}
                Icon={Eye}
                label="Vista"
                activeColor="text-cine-green"
              />
              <ActionBtn
                active={false}
                onClick={() => setShowShare(true)}
                Icon={Send}
                label="Enviar"
                activeColor="text-cine-blue"
              />
            </div>
          </div>
        </div>

        {/* ───── scores ───── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <ScoreCard
            emoji="⭐"
            label="IMDb"
            value={scores.imdb?.score}
            subtitle={scores.imdb?.votes ? `${scores.imdb.votes} votos` : null}
            color="text-cine-gold"
          />
          <ScoreCard
            emoji="🍅"
            label="Rotten Tomatoes"
            value={scores.rotten_tomatoes?.score != null ? `${scores.rotten_tomatoes.score}%` : null}
            color={
              scores.rotten_tomatoes?.score >= 60
                ? "text-cine-green"
                : "text-cine-accent"
            }
          />
          <ScoreCard
            emoji="🎬"
            label="FilmAffinity"
            value={scores.filmaffinity?.score}
            subtitle={
              scores.filmaffinity?.votes
                ? `${scores.filmaffinity.votes} votos`
                : null
            }
            color="text-cine-blue"
          />
          <ScoreCard
            emoji="Ⓜ️"
            label="Metascore"
            value={scores.metascore && scores.metascore !== "N/A" ? scores.metascore : null}
            color={
              scores.metascore >= 61
                ? "text-cine-green"
                : scores.metascore >= 40
                ? "text-cine-gold"
                : "text-cine-accent"
            }
          />
        </div>

        {/* FilmAffinity link */}
        {scores.filmaffinity?.url && (
          <a
            href={scores.filmaffinity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-cine-blue hover:underline"
          >
            Ver en FilmAffinity <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* ───── sinopsis ───── */}
        {movie.overview && (
          <section className="mt-6">
            <h2 className="text-base font-bold mb-2">Sinopsis</h2>
            <p className="text-sm text-cine-muted leading-relaxed">
              {movie.overview}
            </p>
          </section>
        )}

        {/* ───── streaming providers ───── */}
        {(providers.flatrate?.length > 0 ||
          providers.rent?.length > 0 ||
          providers.buy?.length > 0) && (
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Dónde ver</h2>
            <div className="space-y-3">
              <ProviderRow label="Suscripción" items={providers.flatrate} />
              <ProviderRow label="Alquiler" items={providers.rent} />
              <ProviderRow label="Compra" items={providers.buy} />
            </div>
            {providers.link && (
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-cine-blue hover:underline"
              >
                Ver todas las opciones en TMDB{" "}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </section>
        )}

        {/* ───── cast ───── */}
        {movie.cast?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Reparto</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {movie.cast.slice(0, 15).map((c) => (
                <div
                  key={c.name}
                  className="flex-shrink-0 w-20 text-center"
                >
                  {c.profile_image ? (
                    <img
                      src={imgUrl(c.profile_image, "w185")}
                      alt={c.name}
                      className="w-16 h-16 rounded-full mx-auto object-cover ring-1 ring-cine-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto bg-cine-card ring-1 ring-cine-border flex items-center justify-center text-cine-muted text-lg">
                      🎭
                    </div>
                  )}
                  <p className="text-[11px] font-semibold mt-1 line-clamp-2 leading-tight">
                    {c.name}
                  </p>
                  {c.character && (
                    <p className="text-[10px] text-cine-muted line-clamp-1">
                      {c.character}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── friend ratings ───── */}
        {friendRatings.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-cine-gold" /> Puntuaciones de amigos
            </h2>
            <div className="flex flex-wrap gap-3">
              {friendRatings.map((r, i) => (
                <Link
                  key={i}
                  to={`/profile/${r.user_id}`}
                  className="flex items-center gap-2 bg-cine-card rounded-xl px-3 py-2 ring-1 ring-cine-border hover:ring-cine-accent/30 transition"
                >
                  <div className="w-7 h-7 rounded-full bg-cine-border flex items-center justify-center text-[10px] font-bold uppercase text-cine-accent">
                    {r.username?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm font-medium">{r.username}</span>
                  <span className="text-cine-gold text-sm font-bold">
                    {r.rating}/10
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ───── Modals ───── */}
      {showShare && movie && (
        <ShareModal movie={miniMovie} onClose={() => setShowShare(false)} />
      )}
      {showRating && movie && (
        <RatingModal
          movie={miniMovie}
          onClose={() => setShowRating(false)}
          onConfirm={(rating) => {
            addToWatched(miniMovie, rating);
            setShowRating(false);
          }}
        />
      )}
    </div>
  );
}

/* ───── tiny sub-components ───── */

function ActionBtn({ active, onClick, Icon, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ring-1 ${
        active
          ? `${activeColor} bg-white/5 ring-current`
          : "text-cine-muted ring-cine-border hover:ring-white/30 hover:text-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5" fill={active ? "currentColor" : "none"} />
      {label}
    </button>
  );
}

function ProviderRow({ label, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs text-cine-muted mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <div
            key={p.provider_name}
            className="flex items-center gap-2 bg-cine-card rounded-lg px-2.5 py-1.5 ring-1 ring-cine-border"
          >
            {p.logo && (
              <img
                src={imgUrl(p.logo, "w45")}
                alt={p.provider_name}
                className="w-6 h-6 rounded"
              />
            )}
            <span className="text-xs">{p.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
