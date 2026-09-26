import { ImageResponse } from "next/og";

/**
 * The card WhatsApp draws for an occasions link.
 *
 * The shop's own card talks about favourite foods to campus, which is the
 * wrong card entirely here: somebody sends this to their mother about a care
 * birthday box and what arrives is an advert for fried chicken.
 */
export const alt = "Sudu packs food for birthdays, match days and games nights at PAU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OccasionsOpengraphImage() {
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
          {/* Drawn, not fetched: a share card cannot wait on a file to
              download before it renders. */}
          <svg width="88" height="88" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="116" fill="#ff5a1f" />
            <path
              d="M120 190 L256 122 L392 190 L256 258 Z"
              fill="none"
              stroke="#fff1ea"
              strokeWidth="26"
              strokeLinejoin="round"
            />
            <path
              d="M120 190 V352 L256 420 V258"
              fill="none"
              stroke="#fff1ea"
              strokeWidth="26"
              strokeLinejoin="round"
            />
            <path
              d="M392 190 V352 L256 420"
              fill="none"
              stroke="#fff1ea"
              strokeWidth="26"
              strokeLinejoin="round"
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
            Food for a room full of people
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            A birthday, a match, a games night. Packed for the day, one price
            with delivery in it, to PAU.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{ height: 10, width: 10, borderRadius: 999, background: "#ff5a1f" }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>sudu.store</div>
        </div>
      </div>
    ),
    size
  );
}
