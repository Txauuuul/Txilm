import axios from "axios";

// En desarrollo Vite proxea /api → localhost:8000
// En producción (Vercel) apunta al backend desplegado
const isProd = import.meta.env.PROD;
const BASE = isProd
  ? (import.meta.env.VITE_API_URL || "https://txilms-api.vercel.app")
  : "/api";

const http = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

/** Buscar películas por texto */
export async function searchMovies(query, region = "ES", page = 1) {
  const { data } = await http.get("/search", {
    params: { query, region, page },
  });
  return data;
}

/** Detalle completo de una película (TMDB + OMDb + FA) */
export async function getMovieDetail(tmdbId, region = "ES") {
  const { data } = await http.get(`/movie/${tmdbId}`, {
    params: { region },
  });
  return data;
}

/** Películas en tendencia */
export async function getTrending(timeWindow = "week", page = 1) {
  const { data } = await http.get("/trending", {
    params: { time_window: timeWindow, page },
  });
  return data;
}

/** Health check */
export async function healthCheck() {
  const { data } = await http.get("/health");
  return data;
}
