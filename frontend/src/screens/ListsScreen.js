/**
 * Txilms - ListsScreen
 * =====================
 * Pantalla con Top Tab Navigator que divide las películas guardadas en:
 *   - Favoritos
 *   - Pendientes
 *   - Vistas
 *
 * Cada tab muestra un grid con los pósters de las películas.
 */

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";

import useStore from "../store/useStore";
import { COLORS, SIZES, SHADOWS } from "../theme/theme";

const Tab = createMaterialTopTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_COLUMNS = 3;
const GRID_GAP = SIZES.md;
const POSTER_GRID_W =
  (SCREEN_WIDTH - SIZES.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const POSTER_GRID_H = POSTER_GRID_W * 1.5;

// ── Componente de lista reutilizable ─────────────────────
function MovieGrid({ movies, emptyIcon, emptyText, navigation }) {
  if (movies.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={emptyIcon} size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>{emptyText}</Text>
        <Text style={styles.emptySubtitle}>
          Busca películas y añádelas a esta lista
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={movies}
      keyExtractor={(item) => String(item.tmdb_id)}
      numColumns={GRID_COLUMNS}
      contentContainerStyle={styles.gridContainer}
      columnWrapperStyle={styles.gridRow}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.gridItem}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("Details", {
              tmdbId: item.tmdb_id,
              movie: item,
            })
          }
        >
          <View style={[styles.gridPosterWrap, SHADOWS.poster]}>
            <Image
              source={
                item.poster
                  ? { uri: item.poster }
                  : require("../../assets/no-poster.png")
              }
              style={styles.gridPoster}
            />
            {item.vote_average > 0 && (
              <View style={styles.gridBadge}>
                <Text style={styles.gridBadgeText}>
                  ⭐ {Number(item.vote_average).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.year ? (
            <Text style={styles.gridYear}>{item.year}</Text>
          ) : null}
        </TouchableOpacity>
      )}
    />
  );
}

// ── Tabs individuales ────────────────────────────────────
function FavoritesTab({ navigation }) {
  const favorites = useStore((s) => s.favorites);
  return (
    <MovieGrid
      movies={favorites}
      emptyIcon="heart-outline"
      emptyText="Sin favoritos aún"
      navigation={navigation}
    />
  );
}

function WatchlistTab({ navigation }) {
  const watchlist = useStore((s) => s.watchlist);
  return (
    <MovieGrid
      movies={watchlist}
      emptyIcon="bookmark-outline"
      emptyText="Sin pendientes aún"
      navigation={navigation}
    />
  );
}

function WatchedTab({ navigation }) {
  const watched = useStore((s) => s.watched);
  return (
    <MovieGrid
      movies={watched}
      emptyIcon="eye-outline"
      emptyText="Sin películas vistas aún"
      navigation={navigation}
    />
  );
}

// ── Pantalla principal con Top Tabs ──────────────────────
export default function ListsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Listas</Text>
        <Text style={styles.headerSubtitle}>
          Tu colección personal de películas
        </Text>
      </View>

      {/* Top Tab Navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0.5,
            borderBottomColor: COLORS.border,
          },
          tabBarIndicatorStyle: {
            backgroundColor: COLORS.primary,
            height: 3,
            borderRadius: 1.5,
          },
          tabBarLabelStyle: {
            fontWeight: "700",
            fontSize: SIZES.fontSm,
            textTransform: "none",
          },
          tabBarPressColor: COLORS.primary + "20",
        }}
      >
        <Tab.Screen
          name="Favoritos"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="heart" size={18} color={color} />
            ),
          }}
        >
          {() => <FavoritesTab navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen
          name="Pendientes"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="bookmark" size={18} color={color} />
            ),
          }}
        >
          {() => <WatchlistTab navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen
          name="Vistas"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="eye" size={18} color={color} />
            ),
          }}
        >
          {() => <WatchedTab navigation={navigation} />}
        </Tab.Screen>
      </Tab.Navigator>
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
  },
  headerTitle: {
    fontSize: SIZES.font2xl,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Grid
  gridContainer: {
    padding: SIZES.lg,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: POSTER_GRID_W,
    marginBottom: SIZES.lg,
  },
  gridPosterWrap: {
    borderRadius: SIZES.radiusMd,
    overflow: "hidden",
  },
  gridPoster: {
    width: POSTER_GRID_W,
    height: POSTER_GRID_H,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceLight,
  },
  gridBadge: {
    position: "absolute",
    bottom: SIZES.xs,
    left: SIZES.xs,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
  },
  gridBadgeText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "700",
  },
  gridTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  gridYear: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: SIZES.md,
  },
  emptyTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: SIZES.xxl,
  },
});
