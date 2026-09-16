import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1614",
        paper: "#faf7f2",
        brand: { DEFAULT: "#e4572e", dark: "#bf3f1c", tint: "#fdeee8" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26, 22, 20, 0.06), 0 8px 24px -12px rgba(26, 22, 20, 0.18)",
        bar: "0 -4px 20px -8px rgba(26, 22, 20, 0.25)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
