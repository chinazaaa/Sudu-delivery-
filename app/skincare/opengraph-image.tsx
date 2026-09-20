import { ImageResponse } from "next/og";

/**
 * The card WhatsApp draws for the skincare link.
 *
 * The shop's own card talks about KFC and Domino's, which is a card about the
 * wrong shop: somebody sent a link to cleanser and their friends saw fried
 * chicken. Same drawing, its own words.
 *
 * And it does not say PAU. Food goes to campus and nowhere else, but a parcel
 * on a weekly car goes anywhere in Lagos, so a card naming the university
 * turns away every person this shelf was opened for: the link gets forwarded
 * out of the student group to somebody's sister in Ikeja, and she reads it as
 * not for her.
 */
export const alt = "Skincare from Sudu, delivered anywhere in Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SkincareOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14110f",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* The bag, drawn rather than fetched: a share card cannot wait on
              a file to download before it renders. */}
          <svg width="88" height="88" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="116" fill="#ff5a1f" />
            <path
              d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z"
              fill="#fff1ea"
            />
            <path
              d="M196 180v-26a60 60 0 0 1 120 0v26"
              fill="none"
              stroke="#fff1ea"
              strokeWidth="30"
              strokeLinecap="round"
            />
            <path
              d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
              fill="none"
              stroke="#ff5a1f"
              strokeWidth="36"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff" }}>Sudu</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            Skincare, delivered to you
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            The brands you already buy, brought to your door anywhere in
            Lagos. Order any day, it comes on the weekly run.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              height: 10,
              width: 10,
              borderRadius: 999,
              background: "#ff5a1f",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>sudu.store</div>
        </div>
      </div>
    ),
    size
  );
}
