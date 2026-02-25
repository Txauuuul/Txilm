/**
 * Txilms - HomeScreen
 * ====================
 * Pantalla principal con:
 *   - Selector de país
 *   - Barra de búsqueda con autocompletado
 *   - Carrusel horizontal de películas populares/tendencia
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { searchMovies, getTrending } from "../services/api";
import useStore, { COUNTRIES } from "../store/useStore";
import { COLORS, SIZES, SHADOWS } from "../theme/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const POSTER_CAROUSEL_W = SCREEN_WIDTH * 0.38;
const POSTER_CAROUSEL_H = POSTER_CAROUSEL_W * 1.5;

export default function HomeScreen({ navigation }) {
  // ── Estado ──
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const searchTimeout = useRef(null);

  const selectedCountry = useStore((s) => s.selectedCountry);
  const setCountry = useStore((s) => s.setCountry);

  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountry);

  // ── Cargar tendencias al montar ──
  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      setTrendingLoading(true);
      const data = await getTrending("week");
      setTrending(data);
    } catch (err) {
      console.error("Error cargando tendencias:", err);
    } finally {
      setTrendingLoading(false);
    }
  };

  // ── Búsqueda con debounce ──
  const handleSearch = useCallback(
    (text) => {
      setQuery(text);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      if (text.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      searchTimeout.current = setTimeout(async () => {
        try {
          setLoading(true);
          const data = await searchMovies(text, selectedCountry);
          setSearchResults(data.results || []);
        } catch (err) {
          console.error("Error buscando:", err);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [selectedCountry]
  );

  // ── Navegar a detalle ──
  const goToDetail = (movie) => {
    navigation.navigate("Details", { tmdbId: movie.tmdb_id, movie });
  };

  // ── Render: Resultado de búsqueda ──
  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchItem}
      onPress={() => goToDetail(item)}
      activeOpacity={0.7}
    >
      <Image
        source={
          item.poster
            ? { uri: item.poster }
            : require("../../assets/no-poster.png")
        }
        style={styles.searchPoster}
        defaultSource={require("../../assets/no-poster.png")}
      />
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.original_title && item.original_title !== item.title && (
          <Text style={styles.searchOriginal} numberOfLines={1}>
            {item.original_title}
          </Text>
        )}
        <View style={styles.searchMeta}>
          {item.year ? (
            <Text style={styles.searchYear}>{item.year}</Text>
          ) : null}
          {item.vote_average > 0 && (
            <View style={styles.searchRating}>
              <Ionicons name="star" size={12} color={COLORS.imdbYellow} />
              <Text style={styles.searchRatingText}>
                {item.vote_average.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        {item.overview ? (
          <Text style={styles.searchOverview} numberOfLines={2}>
            {item.overview}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  // ── Render: Item del carrusel ──
  const renderTrendingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.carouselItem}
      onPress={() => goToDetail(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.carouselPosterWrap, SHADOWS.poster]}>
        <Image
          source={
            item.poster
              ? { uri: item.poster }
              : require("../../assets/no-poster.png")
          }
          style={styles.carouselPoster}
          defaultSource={require("../../assets/no-poster.png")}
        />
        {item.vote_average > 0 && (
          <View style={styles.carouselBadge}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={styles.carouselBadgeText}>
              {item.vote_average.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.carouselTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.year ? (
        <Text style={styles.carouselYear}>{item.year}</Text>
      ) : null}
    </TouchableOpacity>
  );

  // ── Render: Selector de país ──
  const renderCountryPicker = () => (
    <Modal
      visible={showCountryPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCountryPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Selecciona tu país</Text>
          <Text style={styles.modalSubtitle}>
            Para filtrar plataformas de streaming
          </Text>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryItem,
                  item.code === selectedCountry && styles.countryItemActive,
                ]}
                onPress={() => {
                  setCountry(item.code);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryCode}>{item.code}</Text>
                {item.code === selectedCountry && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={COLORS.primary}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logo}>🎬 Txilms</Text>
            <Text style={styles.subtitle}>Agregador de Críticas</Text>
          </View>
          <TouchableOpacity
            style={styles.countryButton}
            onPress={() => setShowCountryPicker(true)}
          >
            <Text style={styles.countryButtonFlag}>
              {currentCountry?.flag || "🌍"}
            </Text>
            <Text style={styles.countryButtonText}>
              {selectedCountry}
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Barra de búsqueda ── */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar películas..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          {loading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={{ marginLeft: SIZES.sm }}
            />
          )}
        </View>
      </View>

      {/* ── Contenido principal ── */}
      {searchResults.length > 0 || query.length >= 2 ? (
        // Resultados de búsqueda
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.tmdb_id)}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.searchList}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="film-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>
                  No se encontraron resultados
                </Text>
              </View>
            )
          }
        />
      ) : (
        // Vista principal con tendencias
        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sección: En Tendencia ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>En Tendencia</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Las películas más populares esta semana
            </Text>

            {trendingLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={trending}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.tmdb_id)}
                renderItem={renderTrendingItem}
                contentContainerStyle={styles.carouselContainer}
                snapToInterval={POSTER_CAROUSEL_W + SIZES.md}
                decelerationRate="fast"
              />
            )}
          </View>

          {/* ── Espacio extra ── */}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Modal de país ── */}
      {renderCountryPicker()}
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: SIZES.lg,
    paddingTop: Platform.OS === "android" ? 40 : SIZES.md,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  logo: {
    fontSize: SIZES.font2xl,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Country button
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    gap: 6,
  },
  countryButtonFlag: {
    fontSize: 18,
  },
  countryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: SIZES.fontMd,
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: SIZES.md,
    height: 46,
  },
  searchIcon: {
    marginRight: SIZES.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.fontLg,
    color: COLORS.textPrimary,
  },

  // Search results
  searchList: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.card,
  },
  searchPoster: {
    width: 60,
    height: 90,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceLight,
  },
  searchInfo: {
    flex: 1,
    marginLeft: SIZES.md,
    marginRight: SIZES.sm,
  },
  searchTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchOriginal: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  searchMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 10,
  },
  searchYear: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchRatingText: {
    fontSize: SIZES.fontSm,
    color: COLORS.imdbYellow,
    fontWeight: "700",
  },
  searchOverview: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 14,
  },

  // Main scroll
  mainScroll: {
    flex: 1,
  },

  // Section
  section: {
    marginTop: SIZES.xl,
    paddingLeft: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
  },
  sectionTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SIZES.lg,
  },

  // Carousel
  carouselContainer: {
    paddingRight: SIZES.lg,
  },
  carouselItem: {
    width: POSTER_CAROUSEL_W,
    marginRight: SIZES.md,
  },
  carouselPosterWrap: {
    borderRadius: SIZES.radiusMd,
    overflow: "hidden",
  },
  carouselPoster: {
    width: POSTER_CAROUSEL_W,
    height: POSTER_CAROUSEL_H,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceLight,
  },
  carouselBadge: {
    position: "absolute",
    top: SIZES.sm,
    right: SIZES.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    gap: 3,
  },
  carouselBadgeText: {
    fontSize: SIZES.fontXs,
    color: "#FFF",
    fontWeight: "700",
  },
  carouselTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: SIZES.sm,
  },
  carouselYear: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Loading
  loadingContainer: {
    height: POSTER_CAROUSEL_H,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    color: COLORS.textMuted,
  },

  // Country Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    maxHeight: "70%",
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: "center",
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
  },
  modalTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "800",
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.xl,
  },
  modalSubtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    paddingHorizontal: SIZES.xl,
    marginTop: 4,
    marginBottom: SIZES.lg,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    gap: SIZES.md,
  },
  countryItemActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: SIZES.fontLg,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  countryCode: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginRight: SIZES.sm,
  },
});
