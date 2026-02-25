/**
 * Txilms - Tema de la aplicación
 * ================================
 * Colores, tipografía y espaciado centralizados.
 * Temática cinematográfica oscura y elegante.
 */

export const COLORS = {
  // ── Fondo y superficies ──
  background: "#0A0A0F",
  surface: "#14141F",
  surfaceLight: "#1E1E2E",
  card: "#1A1A2A",
  cardHover: "#252538",

  // ── Texto ──
  textPrimary: "#F0F0F5",
  textSecondary: "#A0A0B0",
  textMuted: "#606070",

  // ── Acentos ──
  primary: "#E50914", // Rojo cinematográfico
  primaryLight: "#FF2D38",
  accent: "#FFD700", // Dorado - cine

  // ── Puntuaciones ──
  imdbYellow: "#F5C518",
  rtRed: "#FA320A",
  rtGreen: "#66CC33",
  faBlue: "#3B5FA0",

  // ── Estado ──
  success: "#00C853",
  warning: "#FFB300",
  error: "#FF1744",

  // ── Bordes ──
  border: "#2A2A3A",
  borderLight: "#3A3A4A",

  // ── Gradientes ──
  gradientStart: "rgba(10, 10, 15, 0)",
  gradientEnd: "rgba(10, 10, 15, 1)",
};

export const SIZES = {
  // ── Tipografía ──
  fontXs: 10,
  fontSm: 12,
  fontMd: 14,
  fontLg: 16,
  fontXl: 20,
  font2xl: 24,
  font3xl: 32,
  fontTitle: 28,

  // ── Espaciado ──
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  // ── Bordes ──
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,

  // ── Layout ──
  posterWidth: 120,
  posterHeight: 180,
  posterWidthLg: 160,
  posterHeightLg: 240,
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  poster: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
};
