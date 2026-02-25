/**
 * Txilms - DetailsScreen
 * =======================
 * Pantalla de detalle de película con:
 *   - Póster grande + degradado dinámico (basado en colores de la imagen)
 *   - Sinopsis en español
 *   - Fila de puntuaciones: IMDb, Rotten Tomatoes, FilmAffinity
 *   - Plataformas de streaming por país
 *   - Botones: Favoritos, Pendientes, Visto
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { getMovieDetail } from "../services/api";
import useStore from "../store/useStore";
import { COLORS, SIZES, SHADOWS } from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const POSTER_WIDTH = SCREEN_WIDTH * 0.45;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

// ── Intentar cargar react-native-image-colors ──
let getColors = null;
try {
  const ImageColors = require("react-native-image-colors");
  getColors = ImageColors.getColors || ImageColors.default?.getColors;
} catch (e) {
  // Si no está instalado, usaremos un color por defecto
}

export default function DetailsScreen({ route, navigation }) {
  const { tmdbId, movie: basicMovie } = route.params;

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dominantColor, setDominantColor] = useState(COLORS.primary);

  const selectedCountry = useStore((s) => s.selectedCountry);
  const {
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    addToWatched,
    removeFromWatched,
    isWatched,
    simplifyMovie,
  } = useStore();

  // ── Cargar detalle ──
  useEffect(() => {
    loadDetail();
  }, [tmdbId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMovieDetail(tmdbId, selectedCountry);
      setMovie(data);

      // Extraer color dominante del póster
      if (data.poster && getColors) {
        try {
          const colors = await getColors(data.poster, {
            fallback: COLORS.primary,
            cache: true,
          });
          const color =
            colors.dominant ||
            colors.vibrant ||
            colors.primary ||
            COLORS.primary;
          setDominantColor(color);
        } catch {
          setDominantColor(COLORS.primary);
        }
      }
    } catch (err) {
      console.error("Error cargando detalle:", err);
      setError("No se pudo cargar la información de la película.");
    } finally {
      setLoading(false);
    }
  };

  // ── Acciones de listas ──
  const movieForList = movie
    ? simplifyMovie({
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        vote_average: movie.scores?.imdb?.score || 0,
      })
    : null;

  const toggleFavorite = () => {
    if (!movieForList) return;
    if (isFavorite(movie.tmdb_id)) {
      removeFromFavorites(movie.tmdb_id);
    } else {
      addToFavorites(movieForList);
    }
  };

  const toggleWatchlist = () => {
    if (!movieForList) return;
    if (isInWatchlist(movie.tmdb_id)) {
      removeFromWatchlist(movie.tmdb_id);
    } else {
      addToWatchlist(movieForList);
    }
  };

  const toggleWatched = () => {
    if (!movieForList) return;
    if (isWatched(movie.tmdb_id)) {
      removeFromWatched(movie.tmdb_id);
    } else {
      addToWatched(movieForList);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando puntuaciones...</Text>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (error || !movie) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error || "Error desconocido"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const scores = movie.scores || {};
  const providers = movie.watch_providers || {};

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero: Backdrop + Póster ── */}
        <View style={styles.hero}>
          {/* Backdrop image */}
          {movie.backdrop && (
            <Image
              source={{ uri: movie.backdrop }}
              style={styles.backdrop}
              blurRadius={Platform.OS === "ios" ? 5 : 3}
            />
          )}

          {/* Degradado superpuesto con color dominante */}
          <LinearGradient
            colors={[
              `${dominantColor}55`,
              `${dominantColor}33`,
              COLORS.background,
            ]}
            style={styles.heroGradient}
          />

          {/* Botón atrás */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Póster centrado */}
          <View style={[styles.posterContainer, SHADOWS.poster]}>
            <Image
              source={
                movie.poster
                  ? { uri: movie.poster }
                  : require("../../assets/no-poster.png")
              }
              style={styles.poster}
            />
          </View>
        </View>

        {/* ── Info básica ── */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{movie.title}</Text>
          {movie.original_title && movie.original_title !== movie.title && (
            <Text style={styles.originalTitle}>{movie.original_title}</Text>
          )}

          <View style={styles.metaRow}>
            {movie.rated && movie.rated !== "N/A" ? (
              <View style={[styles.metaChip, { backgroundColor: COLORS.primary + "30" }]}>
                <Text style={[styles.metaText, { color: COLORS.primary, fontWeight: "700" }]}>
                  {movie.rated}
                </Text>
              </View>
            ) : null}
            {movie.year ? (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{movie.year}</Text>
              </View>
            ) : null}
            {movie.runtime ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{movie.runtime} min</Text>
              </View>
            ) : null}
            {movie.director ? (
              <View style={styles.metaChip}>
                <Ionicons name="videocam-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{movie.director}</Text>
              </View>
            ) : null}
          </View>

          {/* Géneros */}
          {movie.genres?.length > 0 && (
            <View style={styles.genresRow}>
              {movie.genres.map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Botones de acción ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isFavorite(movie.tmdb_id) && styles.actionButtonActive,
            ]}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isFavorite(movie.tmdb_id) ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite(movie.tmdb_id) ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                isFavorite(movie.tmdb_id) && styles.actionTextActive,
              ]}
            >
              Favorito
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isInWatchlist(movie.tmdb_id) && styles.actionButtonActive,
            ]}
            onPress={toggleWatchlist}
          >
            <Ionicons
              name={isInWatchlist(movie.tmdb_id) ? "bookmark" : "bookmark-outline"}
              size={22}
              color={
                isInWatchlist(movie.tmdb_id) ? COLORS.accent : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.actionText,
                isInWatchlist(movie.tmdb_id) && styles.actionTextActive,
              ]}
            >
              Pendiente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isWatched(movie.tmdb_id) && styles.actionButtonActive,
            ]}
            onPress={toggleWatched}
          >
            <Ionicons
              name={isWatched(movie.tmdb_id) ? "eye" : "eye-outline"}
              size={22}
              color={isWatched(movie.tmdb_id) ? COLORS.success : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                isWatched(movie.tmdb_id) && styles.actionTextActive,
              ]}
            >
              Vista
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Puntuaciones ── */}
        <View style={styles.scoresSection}>
          <Text style={styles.sectionTitle}>Puntuaciones</Text>
          <View style={styles.scoresRow}>
            {/* IMDb */}
            <View style={styles.scoreCard}>
              <View style={[styles.scoreIcon, { backgroundColor: COLORS.imdbYellow + "20" }]}>
                <Text style={styles.scoreIconText}>⭐</Text>
              </View>
              <Text style={styles.scoreName}>IMDb</Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: COLORS.imdbYellow },
                ]}
              >
                {scores.imdb?.score
                  ? `${scores.imdb.score}/10`
                  : "—"}
              </Text>
              {scores.imdb?.votes && (
                <Text style={styles.scoreSubtext}>
                  {scores.imdb.votes}
                </Text>
              )}
            </View>

            {/* Rotten Tomatoes */}
            <View style={styles.scoreCard}>
              <View
                style={[
                  styles.scoreIcon,
                  {
                    backgroundColor:
                      (scores.rotten_tomatoes?.score ?? 0) >= 60
                        ? COLORS.rtGreen + "20"
                        : COLORS.rtRed + "20",
                  },
                ]}
              >
                <Text style={styles.scoreIconText}>🍅</Text>
              </View>
              <Text style={styles.scoreName}>Rotten T.</Text>
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color:
                      (scores.rotten_tomatoes?.score ?? 0) >= 60
                        ? COLORS.rtGreen
                        : COLORS.rtRed,
                  },
                ]}
              >
                {scores.rotten_tomatoes?.score != null
                  ? `${scores.rotten_tomatoes.score}%`
                  : "—"}
              </Text>
            </View>

            {/* FilmAffinity */}
            <View style={styles.scoreCard}>
              <View style={[styles.scoreIcon, { backgroundColor: COLORS.faBlue + "20" }]}>
                <Text style={styles.scoreIconText}>🎬</Text>
              </View>
              <Text style={styles.scoreName}>FilmAffinity</Text>
              <Text
                style={[styles.scoreValue, { color: COLORS.faBlue }]}
              >
                {scores.filmaffinity?.score != null
                  ? `${scores.filmaffinity.score}/10`
                  : "—"}
              </Text>
              {scores.filmaffinity?.votes && (
                <Text style={styles.scoreSubtext}>
                  {scores.filmaffinity.votes} votos
                </Text>
              )}
            </View>

            {/* Metascore */}
            {scores.metascore != null && (
              <View style={styles.scoreCard}>
                <View
                  style={[
                    styles.scoreIcon,
                    {
                      backgroundColor:
                        scores.metascore >= 60
                          ? "#66CC33" + "20"
                          : scores.metascore >= 40
                          ? "#FFCC33" + "20"
                          : "#FF0000" + "20",
                    },
                  ]}
                >
                  <Text style={styles.scoreIconText}>Ⓜ️</Text>
                </View>
                <Text style={styles.scoreName}>Metascore</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    {
                      color:
                        scores.metascore >= 60
                          ? "#66CC33"
                          : scores.metascore >= 40
                          ? "#FFCC33"
                          : "#FF0000",
                    },
                  ]}
                >
                  {scores.metascore}/100
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Sinopsis ── */}
        {movie.overview ? (
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text style={styles.synopsis}>{movie.overview}</Text>
          </View>
        ) : null}

        {/* ── Plataformas de Streaming ── */}
        {(providers.flatrate?.length > 0 ||
          providers.rent?.length > 0 ||
          providers.buy?.length > 0) && (
          <View style={styles.providersSection}>
            <Text style={styles.sectionTitle}>
              Dónde ver{" "}
              <Text style={styles.sectionTitleMuted}>
                ({useStore.getState().selectedCountry})
              </Text>
            </Text>

            {providers.flatrate?.length > 0 && (
              <>
                <Text style={styles.providerCategory}>Suscripción</Text>
                <View style={styles.providersRow}>
                  {providers.flatrate.map((p) => (
                    <View key={p.provider_id} style={styles.providerItem}>
                      {p.logo ? (
                        <Image
                          source={{ uri: p.logo }}
                          style={styles.providerLogo}
                        />
                      ) : (
                        <View style={styles.providerLogoPlaceholder}>
                          <Text style={styles.providerLogoText}>
                            {p.provider_name?.[0] || "?"}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.providerName} numberOfLines={2}>
                        {p.provider_name}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {providers.rent?.length > 0 && (
              <>
                <Text style={styles.providerCategory}>Alquiler</Text>
                <View style={styles.providersRow}>
                  {providers.rent.map((p) => (
                    <View key={p.provider_id} style={styles.providerItem}>
                      {p.logo ? (
                        <Image
                          source={{ uri: p.logo }}
                          style={styles.providerLogo}
                        />
                      ) : (
                        <View style={styles.providerLogoPlaceholder}>
                          <Text style={styles.providerLogoText}>
                            {p.provider_name?.[0] || "?"}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.providerName} numberOfLines={2}>
                        {p.provider_name}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {providers.buy?.length > 0 && (
              <>
                <Text style={styles.providerCategory}>Compra</Text>
                <View style={styles.providersRow}>
                  {providers.buy.map((p) => (
                    <View key={p.provider_id} style={styles.providerItem}>
                      {p.logo ? (
                        <Image
                          source={{ uri: p.logo }}
                          style={styles.providerLogo}
                        />
                      ) : (
                        <View style={styles.providerLogoPlaceholder}>
                          <Text style={styles.providerLogoText}>
                            {p.provider_name?.[0] || "?"}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.providerName} numberOfLines={2}>
                        {p.provider_name}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Reparto ── */}
        {movie.cast?.length > 0 && (
          <View style={styles.castSection}>
            <Text style={styles.sectionTitle}>Reparto</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castScroll}
            >
              {movie.cast.map((person, index) => (
                <View key={`${person.name}-${index}`} style={styles.castItem}>
                  {person.profile_image ? (
                    <Image
                      source={{ uri: person.profile_image }}
                      style={styles.castImage}
                    />
                  ) : (
                    <View style={[styles.castImage, styles.castPlaceholder]}>
                      <Ionicons
                        name="person"
                        size={24}
                        color={COLORS.textMuted}
                      />
                    </View>
                  )}
                  <Text style={styles.castName} numberOfLines={2}>
                    {person.name}
                  </Text>
                  <Text style={styles.castCharacter} numberOfLines={2}>
                    {person.character}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Espacio inferior */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: SIZES.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMd,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontLg,
    textAlign: "center",
    paddingHorizontal: SIZES.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "700",
  },

  // Hero
  hero: {
    height: SCREEN_HEIGHT * 0.45,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 40 : 50,
    left: SIZES.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  posterContainer: {
    borderRadius: SIZES.radiusLg,
    marginBottom: -POSTER_HEIGHT * 0.15,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surfaceLight,
  },

  // Info
  infoSection: {
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
    marginTop: POSTER_HEIGHT * 0.15 + SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  originalTitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  metaText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  genresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  genreChip: {
    backgroundColor: COLORS.primary + "25",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  genreText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primaryLight,
    fontWeight: "600",
  },

  // Action buttons
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: SIZES.xl,
    marginTop: SIZES.xl,
    gap: SIZES.md,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.card,
    gap: 4,
    ...SHADOWS.card,
  },
  actionButtonActive: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  actionTextActive: {
    color: COLORS.textPrimary,
  },

  // Scores
  scoresSection: {
    paddingHorizontal: SIZES.xl,
    marginTop: SIZES.xxl,
  },
  sectionTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  sectionTitleMuted: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    fontWeight: "400",
  },
  scoresRow: {
    flexDirection: "row",
    gap: SIZES.md,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    alignItems: "center",
    gap: SIZES.sm,
    ...SHADOWS.card,
  },
  scoreIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreIconText: {
    fontSize: 22,
  },
  scoreName: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreValue: {
    fontSize: SIZES.fontXl,
    fontWeight: "900",
  },
  scoreSubtext: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
  },

  // Synopsis
  synopsisSection: {
    paddingHorizontal: SIZES.xl,
    marginTop: SIZES.xxl,
  },
  synopsis: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Providers
  providersSection: {
    paddingHorizontal: SIZES.xl,
    marginTop: SIZES.xxl,
  },
  providerCategory: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: SIZES.sm,
    marginBottom: SIZES.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  providersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.md,
    marginBottom: SIZES.md,
  },
  providerItem: {
    alignItems: "center",
    width: 70,
    gap: 4,
  },
  providerLogo: {
    width: 50,
    height: 50,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceLight,
  },
  providerLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  providerLogoText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  providerName: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Cast
  castSection: {
    marginTop: SIZES.xxl,
    paddingLeft: SIZES.xl,
  },
  castScroll: {
    paddingRight: SIZES.xl,
  },
  castItem: {
    width: 80,
    marginRight: SIZES.md,
    alignItems: "center",
  },
  castImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceLight,
  },
  castPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  castName: {
    fontSize: SIZES.fontXs,
    color: COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    marginTop: SIZES.xs,
  },
  castCharacter: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
});
