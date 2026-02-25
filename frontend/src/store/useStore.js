import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStore = create(
  persist(
    (set, get) => ({
      // ── Listas ──
      favorites: [],
      watchlist: [],
      watched: [],

      // ── País seleccionado ──
      country: "ES",
      setCountry: (c) => set({ country: c }),

      // ── Favoritos ──
      addFavorite: (movie) =>
        set((s) => ({
          favorites: s.favorites.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.favorites
            : [movie, ...s.favorites],
        })),
      removeFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.filter((m) => m.tmdb_id !== id),
        })),
      isFavorite: (id) => get().favorites.some((m) => m.tmdb_id === id),
      toggleFavorite: (movie) => {
        const s = get();
        s.isFavorite(movie.tmdb_id)
          ? s.removeFavorite(movie.tmdb_id)
          : s.addFavorite(movie);
      },

      // ── Pendientes ──
      addToWatchlist: (movie) =>
        set((s) => ({
          watchlist: s.watchlist.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.watchlist
            : [movie, ...s.watchlist],
        })),
      removeFromWatchlist: (id) =>
        set((s) => ({
          watchlist: s.watchlist.filter((m) => m.tmdb_id !== id),
        })),
      isInWatchlist: (id) => get().watchlist.some((m) => m.tmdb_id === id),
      toggleWatchlist: (movie) => {
        const s = get();
        s.isInWatchlist(movie.tmdb_id)
          ? s.removeFromWatchlist(movie.tmdb_id)
          : s.addToWatchlist(movie);
      },

      // ── Vistas ──
      addToWatched: (movie) =>
        set((s) => ({
          watched: s.watched.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.watched
            : [movie, ...s.watched],
        })),
      removeFromWatched: (id) =>
        set((s) => ({
          watched: s.watched.filter((m) => m.tmdb_id !== id),
        })),
      isWatched: (id) => get().watched.some((m) => m.tmdb_id === id),
      toggleWatched: (movie) => {
        const s = get();
        s.isWatched(movie.tmdb_id)
          ? s.removeFromWatched(movie.tmdb_id)
          : s.addToWatched(movie);
      },
    }),
    {
      name: "txilms-storage",
    }
  )
);

export default useStore;
