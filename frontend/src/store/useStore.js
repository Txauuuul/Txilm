import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "../api/api";

const useStore = create(
  persist(
    (set, get) => ({
      // ── Listas (sincronizadas con Supabase) ──
      favorites: [],
      watchlist: [],
      watched: [],
      listsLoaded: false,

      // ── País seleccionado ──
      country: "ES",
      setCountry: (c) => set({ country: c }),

      // ── Cargar listas desde API ──
      fetchLists: async () => {
        try {
          const data = await api.getMyLists();
          const favorites = data
            .filter((i) => i.list_type === "favorite")
            .map(normalize);
          const watchlist = data
            .filter((i) => i.list_type === "watchlist")
            .map(normalize);
          const watched = data
            .filter((i) => i.list_type === "watched")
            .map(normalize);
          set({ favorites, watchlist, watched, listsLoaded: true });
        } catch (e) {
          console.error("Error fetching lists:", e);
        }
      },

      // ── Favoritos ──
      addFavorite: async (movie) => {
        const item = toListItem(movie, "favorite");
        set((s) => ({
          favorites: s.favorites.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.favorites
            : [item, ...s.favorites],
        }));
        try {
          await api.addToList({
            tmdb_id: movie.tmdb_id,
            list_type: "favorite",
            movie_title: movie.title,
            movie_poster: movie.poster,
            movie_year: movie.year,
          });
        } catch {
          set((s) => ({
            favorites: s.favorites.filter((m) => m.tmdb_id !== movie.tmdb_id),
          }));
        }
      },
      removeFavorite: async (id) => {
        const prev = get().favorites;
        set((s) => ({ favorites: s.favorites.filter((m) => m.tmdb_id !== id) }));
        try {
          await api.removeFromList(id, "favorite");
        } catch {
          set({ favorites: prev });
        }
      },
      isFavorite: (id) => get().favorites.some((m) => m.tmdb_id === id),
      toggleFavorite: (movie) => {
        const s = get();
        s.isFavorite(movie.tmdb_id)
          ? s.removeFavorite(movie.tmdb_id)
          : s.addFavorite(movie);
      },

      // ── Pendientes ──
      addToWatchlist: async (movie) => {
        const item = toListItem(movie, "watchlist");
        set((s) => ({
          watchlist: s.watchlist.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.watchlist
            : [item, ...s.watchlist],
        }));
        try {
          await api.addToList({
            tmdb_id: movie.tmdb_id,
            list_type: "watchlist",
            movie_title: movie.title,
            movie_poster: movie.poster,
            movie_year: movie.year,
          });
        } catch {
          set((s) => ({
            watchlist: s.watchlist.filter((m) => m.tmdb_id !== movie.tmdb_id),
          }));
        }
      },
      removeFromWatchlist: async (id) => {
        const prev = get().watchlist;
        set((s) => ({ watchlist: s.watchlist.filter((m) => m.tmdb_id !== id) }));
        try {
          await api.removeFromList(id, "watchlist");
        } catch {
          set({ watchlist: prev });
        }
      },
      isInWatchlist: (id) => get().watchlist.some((m) => m.tmdb_id === id),
      toggleWatchlist: (movie) => {
        const s = get();
        s.isInWatchlist(movie.tmdb_id)
          ? s.removeFromWatchlist(movie.tmdb_id)
          : s.addToWatchlist(movie);
      },

      // ── Vistas (con puntuación) ──
      addToWatched: async (movie, rating = null) => {
        const item = { ...toListItem(movie, "watched"), rating };
        set((s) => ({
          watched: s.watched.some((m) => m.tmdb_id === movie.tmdb_id)
            ? s.watched
            : [item, ...s.watched],
        }));
        try {
          await api.addToList({
            tmdb_id: movie.tmdb_id,
            list_type: "watched",
            movie_title: movie.title,
            movie_poster: movie.poster,
            movie_year: movie.year,
            rating,
          });
        } catch {
          set((s) => ({
            watched: s.watched.filter((m) => m.tmdb_id !== movie.tmdb_id),
          }));
        }
      },
      removeFromWatched: async (id) => {
        const prev = get().watched;
        set((s) => ({ watched: s.watched.filter((m) => m.tmdb_id !== id) }));
        try {
          await api.removeFromList(id, "watched");
        } catch {
          set({ watched: prev });
        }
      },
      isWatched: (id) => get().watched.some((m) => m.tmdb_id === id),
      getWatchedRating: (id) => {
        const m = get().watched.find((m) => m.tmdb_id === id);
        return m?.rating || null;
      },
      reRate: async (tmdbId, newRating) => {
        const prev = get().watched;
        set((s) => ({
          watched: s.watched.map((m) =>
            m.tmdb_id === tmdbId ? { ...m, rating: newRating, vote_average: newRating } : m
          ),
        }));
        try {
          await api.updateRating(tmdbId, newRating);
        } catch {
          set({ watched: prev });
        }
      },
      toggleWatched: (movie) => {
        const s = get();
        s.isWatched(movie.tmdb_id)
          ? s.removeFromWatched(movie.tmdb_id)
          : s.addToWatched(movie);
      },
    }),
    {
      name: "txilms-storage",
      partialize: (state) => ({ country: state.country }),
    }
  )
);

// ── Helpers ──

function normalize(item) {
  return {
    tmdb_id: item.tmdb_id,
    title: item.movie_title,
    poster: item.movie_poster,
    year: item.movie_year,
    rating: item.rating,
    list_type: item.list_type,
    vote_average: item.rating,
  };
}

function toListItem(movie, listType) {
  return {
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    poster: movie.poster,
    year: movie.year,
    list_type: listType,
    vote_average: movie.vote_average || null,
  };
}

export default useStore;
