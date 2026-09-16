import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16130f",
        paper: "#fbf8f3",
        brand: { DEFAULT: "#c2410c", dark: "#9a3412" },
      },
    },
  },
  plugins: [],
};

export default config;
