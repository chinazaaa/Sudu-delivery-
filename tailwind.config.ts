import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /*
         * The redesign palette, named as the design system names it.
         *
         * Ink is a near-black with warmth in it rather than a grey, because
         * it is drawn as a 2px border on nearly everything and a true black
         * outline reads as a wireframe. Tomato is the only loud colour and
         * carries white text at 4.9:1; Tomato Deep is for hover and for red
         * text on a light ground, where Tomato itself is too thin to read.
         * Volt is a highlight on Ink and never a text colour on light.
         */
        ink: "#15110e",
        muted: "#5e564e",
        /** Hairlines, which were black at 6% and are now a colour of their
         *  own: a border this heavy has to be drawn rather than implied. */
        line: "#dcd6cc",
        /** The rule between rows in a list, which is lighter than a border
         *  round a card: a table of twenty rows drawn in `line` reads as
         *  twenty cards. */
        rule: "#ece7df",
        /** A neutral chip or a bar's unfilled half: shell with a touch more
         *  in it, so a chip on a shell page is still a shape. */
        wash: "#f1ede6",
        paper: "#ffffff",
        shell: "#f2efe9",
        brand: {
          DEFAULT: "#e5321d",
          dark: "#b8230f",
          tint: "#fff6d6",
        },
        volt: {
          DEFAULT: "#ffd23f",
          /** The border on a soft warning, where a 2px Ink outline would
           *  make a note read as an error. */
          line: "#e8d9a8",
        },
        mint: "#1e7a4c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        /** Condensed, loud, all caps: headlines, prices, numbers. */
        display: ["var(--font-display)", "Arial Narrow", "Impact", "sans-serif"],
        /** Ticket labels, run times, counters. Uppercase and tracked. */
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        /*
         * Hard shadows, not soft ones. The whole look is drawn rather than
         * lit: a 2px outline with a solid offset block behind it, which is
         * a printed sticker rather than a floating card.
         */
        card: "3px 3px 0 #15110e",
        lift: "5px 5px 0 #15110e",
        hard: "4px 4px 0 #15110e",
        press: "2px 2px 0 #15110e",
        bar: "0 -8px 30px -18px rgba(21, 17, 14, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
