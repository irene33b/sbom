/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070B14",
          900: "#0B1220",
          800: "#111827",
          700: "#1B2436",
          600: "#28324A",
          500: "#9AA6C0",
        },
        signal: {
          teal: "#14B8AA",
          tealSoft: "#0E7C74",
          magenta: "#D92A8F",
          magentaSoft: "#A81F6F",
        },
        risk: {
          critical: "#E23B3B",
          high: "#EA7C1F",
          medium: "#D9A62A",
          low: "#4FA35A",
          none: "#5B6B84",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(20,184,170,0.25), 0 0 24px rgba(20,184,170,0.15)",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-slow-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 34s linear infinite",
        "spin-slow-reverse": "spin-slow-reverse 46s linear infinite",
      },
    },
  },
  plugins: [],
};
