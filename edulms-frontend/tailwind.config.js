/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#4F46E5",
        "primary-hover": "#4338CA",
        "primary-light": "#EEF2FF",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#F43F5E",
        "neutral-900": "#111827",
        "neutral-600": "#4B5563",
        "neutral-200": "#E5E7EB",
        "neutral-50": "#F9FAFB",
      },
    },
  },
  plugins: [],
}
