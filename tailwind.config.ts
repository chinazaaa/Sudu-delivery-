import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14110f",
        muted: "#6b6360",
        paper: "#ffffff",
        // The page behind white cards: a hint of warmth, not a cream wash.
        shell: "#f6f5f3",
        brand: {
          DEFAULT: "#ff5a1f",
          dark: "#e0410c",
          tint: "#fff1ea",
        },
        mint: "#0f9d58",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 17, 15, 0.04), 0 10px 30px -18px rgba(20, 17, 15, 0.25)",
        lift: "0 2px 6px rgba(20, 17, 15, 0.06), 0 18px 40px -20px rgba(20, 17, 15, 0.35)",
        bar: "0 -8px 30px -18px rgba(20, 17, 15, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
