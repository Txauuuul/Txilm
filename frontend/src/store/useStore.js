/**
 * Txilms - Store con Zustand
 * ===========================
 * Gestión de estado global:
 *   - País seleccionado
 *   - Listas de usuario (Favoritos, Pendientes, Vistas)
 *
 * Persistencia con AsyncStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lista de países soportados para filtrar streaming.
 */
export const COUNTRIES = [
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "FR", name: "Francia", flag: "🇫🇷" },
  { code: "DE", name: "Alemania", flag: "🇩🇪" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
];

/**
 * Store principal de la aplicación.
 */
const useStore = create(
  persist(
    (set, get) => ({
      // ── Estado ──────────────────────────────
      selectedCountry: "ES",
      favorites: [], // Array de objetos de película simplificados
      watchlist: [], // Pendientes
      watched: [], // Vistas

      // ── Acciones: País ──────────────────────
      setCountry: (code) => set({ selectedCountry: code }),

      // ── Acciones: Favoritos ─────────────────
      addToFavorites: (movie) => {
        const { favorites } = get();
        if (!favorites.find((m) => m.tmdb_id === movie.tmdb_id)) {
          set({ favorites: [movie, ...favorites] });
        }
      },
      removeFromFavorites: (tmdbId) => {
        set({ favorites: get().favorites.filter((m) => m.tmdb_id !== tmdbId) });
      },
      isFavorite: (tmdbId) => {
        return get().favorites.some((m) => m.tmdb_id === tmdbId);
      },

      // ── Acciones: Pendientes ────────────────
      addToWatchlist: (movie) => {
        const { watchlist } = get();
        if (!watchlist.find((m) => m.tmdb_id === movie.tmdb_id)) {
          set({ watchlist: [movie, ...watchlist] });
        }
      },
      removeFromWatchlist: (tmdbId) => {
        set({
          watchlist: get().watchlist.filter((m) => m.tmdb_id !== tmdbId),
        });
      },
      isInWatchlist: (tmdbId) => {
        return get().watchlist.some((m) => m.tmdb_id === tmdbId);
      },

      // ── Acciones: Vistas ────────────────────
      addToWatched: (movie) => {
        const { watched } = get();
        if (!watched.find((m) => m.tmdb_id === movie.tmdb_id)) {
          set({ watched: [movie, ...watched] });
        }
      },
      removeFromWatched: (tmdbId) => {
        set({ watched: get().watched.filter((m) => m.tmdb_id !== tmdbId) });
      },
      isWatched: (tmdbId) => {
        return get().watched.some((m) => m.tmdb_id === tmdbId);
      },

      // ── Utilidades ──────────────────────────
      /**
       * Genera un objeto simplificado de película para guardar en las listas.
       * Evita almacenar datos innecesarios en AsyncStorage.
       */
      simplifyMovie: (movie) => ({
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        vote_average: movie.vote_average || movie.vote_average_tmdb || 0,
      }),
    }),
    {
      name: "txilms-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir estos campos
      partialize: (state) => ({
        selectedCountry: state.selectedCountry,
        favorites: state.favorites,
        watchlist: state.watchlist,
        watched: state.watched,
      }),
    }
  )
);

export default useStore;
