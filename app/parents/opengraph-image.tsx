import { ImageResponse } from "next/og";

/**
 * The card WhatsApp draws for the parents link.
 *
 * This link's whole life is spent as a grey rectangle in a parents' group,
 * so the card is the advert and the page is only what happens if the card
 * works. The shop's own card says "your fav foods to PAU", which is a
 * student's sentence: a woman in Ikoyi reads it as somebody else's business
 * and scrolls past.
 *
 * So it names her child rather than the shop, and it says the two things
 * that answer "who are these people" before she has to ask: how long this
 * has been going, and who on the campus said it was any good.
 */
export const alt = "Sudu delivers food to students at Pan-Atlantic University";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ParentsOpengraphImage() {
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
          {/* Drawn rather than fetched: a share card cannot wait on a file
              to download before it renders. */}
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
          </svg>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff" }}>Sudu</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            Send food to your child at PAU
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            Foodstuff, care packages and hostel packs, delivered to their
            block. One payment, delivery included, and a photograph when it
            is handed over.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{ height: 10, width: 10, borderRadius: 999, background: "#ff5a1f" }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
            On the PAU campus since 2018 · sudu.store
          </div>
        </div>
      </div>
    ),
    size
  );
}
