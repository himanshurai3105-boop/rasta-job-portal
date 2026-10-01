/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1220",
        paper: "#F7F5EF",
        amber: {
          DEFAULT: "#E8A33D",
          dark: "#C87F1E",
        },
        slateblue: "#3B5BDB",
        success: "#2F9E68",
        muted: "#6B7280",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
