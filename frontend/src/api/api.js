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

/** Descubrir películas por género/criterio/plataforma */
export async function discoverMovies({
  sortBy = "popularity.desc",
  withGenres = null,
  voteCountGte = 100,
  voteAverageGte = null,
  withWatchProviders = null,
  watchRegion = null,
  page = 1,
} = {}) {
  const params = { sort_by: sortBy, vote_count_gte: voteCountGte, page };
  if (withGenres) params.with_genres = withGenres;
  if (voteAverageGte != null) params.vote_average_gte = voteAverageGte;
  if (withWatchProviders) params.with_watch_providers = withWatchProviders;
  if (watchRegion) params.watch_region = watchRegion;
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
  review = null,
  genre_ids = null,
}) {
  const { data } = await http.post("/lists", {
    tmdb_id,
    list_type,
    movie_title,
    movie_poster,
    movie_year,
    rating,
    review,
    genre_ids,
  });
  return data;
}

export async function removeFromList(tmdbId, listType) {
  const { data } = await http.delete(`/lists/${tmdbId}/${listType}`);
  return data;
}

export async function updateRating(tmdbId, rating, review = null) {
  const body = { rating };
  if (review !== null) body.review = review;
  const { data } = await http.put(`/lists/${tmdbId}/rating`, body);
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

// ═══════════════════════════════════════════
// Cambiar contraseña
// ═══════════════════════════════════════════

export async function changePassword(oldPassword, newPassword) {
  const { data } = await http.post("/auth/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
}

// ═══════════════════════════════════════════
// Recuperación de contraseña (admin genera código)
// ═══════════════════════════════════════════

export async function generateResetCode(targetUsername, hoursValid = 24) {
  const { data } = await http.post("/admin/reset-codes", {
    target_username: targetUsername,
    hours_valid: hoursValid,
  });
  return data;
}

export async function getResetCodes() {
  const { data } = await http.get("/admin/reset-codes");
  return data;
}

/** Resetear contraseña con código temporal (público, sin auth) */
export async function resetPassword(username, code, newPassword) {
  const { data } = await http.post("/auth/reset-password", {
    username,
    code,
    new_password: newPassword,
  });
  return data;
}

// ═══════════════════════════════════════════
// Sistema de seguimiento (follows)
// ═══════════════════════════════════════════

export async function followUser(userId) {
  const { data } = await http.post(`/follows/${userId}`);
  return data;
}

export async function unfollowUser(userId) {
  const { data } = await http.delete(`/follows/${userId}`);
  return data;
}

export async function getFollowing() {
  const { data } = await http.get("/follows/following");
  return data;
}

export async function getFollowers() {
  const { data } = await http.get("/follows/followers");
  return data;
}

export async function getFollowCounts(userId) {
  const { data } = await http.get(`/follows/counts/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Listas personalizadas
// ═══════════════════════════════════════════

export async function getCustomLists() {
  const { data } = await http.get("/custom-lists");
  return data;
}

export async function createCustomList(name, description = null) {
  const { data } = await http.post("/custom-lists", { name, description });
  return data;
}

export async function deleteCustomList(listId) {
  const { data } = await http.delete(`/custom-lists/${listId}`);
  return data;
}

export async function getCustomListItems(listId) {
  const { data } = await http.get(`/custom-lists/${listId}/items`);
  return data;
}

export async function addToCustomList(listId, { tmdb_id, movie_title, movie_poster, movie_year }) {
  const { data } = await http.post(`/custom-lists/${listId}/items`, {
    tmdb_id, movie_title, movie_poster, movie_year,
  });
  return data;
}

export async function removeFromCustomList(listId, tmdbId) {
  const { data } = await http.delete(`/custom-lists/${listId}/items/${tmdbId}`);
  return data;
}

// ═══════════════════════════════════════════
// Estadísticas
// ═══════════════════════════════════════════

export async function getMyStats() {
  const { data } = await http.get("/stats");
  return data;
}

export async function getUserStats(userId) {
  const { data } = await http.get(`/stats/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Comparar gustos
// ═══════════════════════════════════════════

export async function compareUsers(userId) {
  const { data } = await http.get(`/compare/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Reseñas
// ═══════════════════════════════════════════

export async function getRecentReviews(limit = 20) {
  const { data } = await http.get("/reviews", { params: { limit } });
  return data;
}

// ═══════════════════════════════════════════
// Logros
// ═══════════════════════════════════════════

export async function getMyAchievements() {
  const { data } = await http.get("/achievements");
  return data;
}

export async function getUserAchievements(userId) {
  const { data } = await http.get(`/achievements/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Wrapped (estadísticas anuales)
// ═══════════════════════════════════════════

export async function getWrapped(year) {
  const { data } = await http.get(`/wrapped/${year}`);
  return data;
}

export async function getUserWrapped(year, userId) {
  const { data } = await http.get(`/wrapped/${year}/${userId}`);
  return data;
}

// ═══════════════════════════════════════════
// Predicción de rating
// ═══════════════════════════════════════════

export async function predictRating(tmdbId) {
  const { data } = await http.get(`/predict/${tmdbId}`);
  return data;
}

// ═══════════════════════════════════════════
// Feed de actividad
// ═══════════════════════════════════════════

export async function getFeed(limit = 30) {
  const { data } = await http.get("/feed", { params: { limit } });
  return data;
}

// ═══════════════════════════════════════════
// Próximos estrenos
// ═══════════════════════════════════════════

export async function getUpcoming(region = "ES", page = 1) {
  const { data } = await http.get("/upcoming", { params: { region, page } });
  return data;
}

// ═══════════════════════════════════════════
// Listas colaborativas
// ═══════════════════════════════════════════

export async function toggleCollaborative(listId, isCollaborative) {
  const { data } = await http.patch(`/custom-lists/${listId}/collaborative`, {
    is_collaborative: isCollaborative,
  });
  return data;
}

export async function getCollaborativeEditors(listId) {
  const { data } = await http.get(`/custom-lists/${listId}/editors`);
  return data;
}

export async function addCollaborativeEditor(listId, userId) {
  const { data } = await http.post(`/custom-lists/${listId}/editors`, {
    user_id: userId,
  });
  return data;
}

export async function removeCollaborativeEditor(listId, userId) {
  const { data } = await http.delete(`/custom-lists/${listId}/editors/${userId}`);
  return data;
}

export async function getMyCollaborativeLists() {
  const { data } = await http.get("/collaborative-lists");
  return data;
}
