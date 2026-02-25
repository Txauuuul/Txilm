/**
 * Txilms - Configuración de la API
 * =================================
 * Centraliza la URL base del backend y las funciones de fetch.
 *
 * En PRODUCCIÓN: apunta a tu dominio de Vercel.
 * En DESARROLLO LOCAL: apunta a tu IP local.
 */

// ── URL del Backend ──────────────────────────────────────
// Producción (Vercel): pon aquí tu URL de Vercel cuando despliegues
// Desarrollo local: descomenta la línea de abajo y comenta la de arriba
const API_BASE_URL = "https://txilms-api.vercel.app";
// const API_BASE_URL = "http://172.20.10.2:8000"; // Dev local

/**
 * Busca películas por texto.
 */
export async function searchMovies(query, region = "ES", page = 1) {
  const url = `${API_BASE_URL}/search?query=${encodeURIComponent(
    query
  )}&region=${region}&page=${page}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  return resp.json();
}

/**
 * Obtiene el detalle completo de una película.
 */
export async function getMovieDetail(tmdbId, region = "ES") {
  const url = `${API_BASE_URL}/movie/${tmdbId}?region=${region}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Detail failed: ${resp.status}`);
  return resp.json();
}

/**
 * Obtiene las películas en tendencia.
 */
export async function getTrending(timeWindow = "week", page = 1) {
  const url = `${API_BASE_URL}/trending?time_window=${timeWindow}&page=${page}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Trending failed: ${resp.status}`);
  return resp.json();
}
