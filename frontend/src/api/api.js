import axios from "axios";
import useAuthStore from "../store/useAuthStore";

// En desarrollo Vite proxea /api → localhost:8000
// En producción (Vercel) apunta al backend Vercel
const isProd = import.meta.env.PROD;
const BASE = isProd
  ? (import.meta.env.VITE_API_URL || "https://txilm.vercel.app")
  : "/api";

const http = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

// ── Interceptor: adjuntar token JWT ──
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor: logout automático en 401 con refresh automático ──
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Skip refresh logic for auth endpoints
    if (
      err.response?.status === 401 &&
      !originalRequest?.url?.includes("/auth/") &&
      !originalRequest._retry
    ) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Wait for the ongoing refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh, user } = data;
        useAuthStore.getState().setAuth(user, access_token, newRefresh);

        // Retry original request and all queued requests
        onRefreshed(access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return http(originalRequest);
      } catch (refreshError) {
        // Refresh failed → full logout
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// ═══════════════════════════════════════════
// Películas (endpoints existentes)
// ═══════════════════════════════════════════

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

/** Descubrir películas por género/criterio */
export async function discoverMovies({
  sortBy = "popularity.desc",
  withGenres = null,
  voteCountGte = 100,
  voteAverageGte = null,
  page = 1,
} = {}) {
  const params = { sort_by: sortBy, vote_count_gte: voteCountGte, page };
  if (withGenres) params.with_genres = withGenres;
  if (voteAverageGte != null) params.vote_average_gte = voteAverageGte;
  const { data } = await http.get("/discover", { params });
  return data;
}

/** Películas mejor valoradas */
export async function getTopRated(page = 1) {
  const { data } = await http.get("/top-rated", { params: { page } });
  return data;
}

/** Recomendaciones basadas en una película */
export async function getRecommendations(tmdbId, page = 1) {
  const { data } = await http.get(`/recommendations/${tmdbId}`, {
    params: { page },
  });
  return data;
}

/** Health check */
export async function healthCheck() {
  const { data } = await http.get("/health");
  return data;
}

// ═══════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════

export async function register(username, password, inviteCode) {
  const { data } = await http.post("/auth/register", {
    username,
    password,
    invite_code: inviteCode,
  });
  return data; // { access_token, refresh_token, user }
}

export async function login(username, password) {
  const { data } = await http.post("/auth/login", {
    username,
    password,
  });
  return data;
}

export async function getMe() {
  const { data } = await http.get("/auth/me");
  return data;
}

/** Refrescar sesión con refresh_token */
export async function refreshToken(rt) {
  const { data } = await http.post("/auth/refresh", { refresh_token: rt });
  return data;
}

// ═══════════════════════════════════════════
// Listas de usuario
// ═══════════════════════════════════════════

export async function getMyLists(listType = null) {
  const params = listType ? { list_type: listType } : {};
  const { data } = await http.get("/lists", { params });
  return data;
}

export async function getUserLists(userId, listType = null) {
  const params = listType ? { list_type: listType } : {};
  const { data } = await http.get(`/lists/user/${userId}`, { params });
  return data;
}

export async function addToList({
  tmdb_id,
  list_type,
  movie_title,
  movie_poster = null,
  movie_year = null,
  rating = null,
}) {
  const { data } = await http.post("/lists", {
    tmdb_id,
    list_type,
    movie_title,
    movie_poster,
    movie_year,
    rating,
  });
  return data;
}

export async function removeFromList(tmdbId, listType) {
  const { data } = await http.delete(`/lists/${tmdbId}/${listType}`);
  return data;
}

export async function updateRating(tmdbId, rating) {
  const { data } = await http.put(`/lists/${tmdbId}/rating`, { rating });
  return data;
}

export async function getMovieRatings(tmdbId) {
  const { data } = await http.get(`/movie/${tmdbId}/ratings`);
  return data;
}

// ═══════════════════════════════════════════
// Compartir películas
// ═══════════════════════════════════════════

export async function shareMovie({
  to_user_id,
  tmdb_id,
  movie_title,
  movie_poster = null,
  message = null,
}) {
  const { data } = await http.post("/shares", {
    to_user_id,
    tmdb_id,
    movie_title,
    movie_poster,
    message,
  });
  return data;
}

// ═══════════════════════════════════════════
// Notificaciones
// ═══════════════════════════════════════════

export async function getNotifications(unreadOnly = false) {
  const { data } = await http.get("/notifications", {
    params: { unread_only: unreadOnly },
  });
  return data;
}

export async function getNotificationCount() {
  const { data } = await http.get("/notifications/count");
  return data.count;
}

export async function markNotificationRead(notifId) {
  const { data } = await http.put(`/notifications/${notifId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await http.put("/notifications/read-all");
  return data;
}

// ═══════════════════════════════════════════
// Perfiles
// ═══════════════════════════════════════════

export async function getProfiles() {
  const { data } = await http.get("/profiles");
  return data;
}

export async function getProfile(userId) {
  const { data } = await http.get(`/profiles/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Actividad
// ═══════════════════════════════════════════

export async function getActivity(limit = 20) {
  const { data } = await http.get("/activity", { params: { limit } });
  return data;
}

// ═══════════════════════════════════════════
// Admin: códigos de invitación
// ═══════════════════════════════════════════

export async function generateInviteCodes(count = 5) {
  const { data } = await http.post("/admin/invite-codes", { count });
  return data.codes;
}

export async function getInviteCodes() {
  const { data } = await http.get("/admin/invite-codes");
  return data;
}
