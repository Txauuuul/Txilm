/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        cine: {
          bg: "#0a0a0f",
          card: "#14141f",
          border: "#1e1e2e",
          accent: "#e50914",
          gold: "#f5c518",
          green: "#21d07a",
          blue: "#3b82f6",
          muted: "#8b8b9e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
