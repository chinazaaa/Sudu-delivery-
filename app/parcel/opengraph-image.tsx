import { ImageResponse } from "next/og";

/**
 * The card WhatsApp draws for the parcel link.
 *
 * The shop's own card talks about food to campus, which is the wrong card
 * entirely: somebody sends this link to a friend who has a dress sitting in a
 * Lekki boutique, and what arrives is an advert for fried chicken.
 *
 * It names both ends rather than the service. Nobody is looking for a parcel
 * service; they are looking for somebody who goes from where the thing is to
 * where they are, and the routes are the whole answer to that.
 */
export const alt = "Sudu carries parcels between Lagos and PAU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ParcelOpengraphImage() {
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
              a file to download before it renders. A box on the front of it,
              because what travels here is not lunch. */}
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
            <rect
              x="206"
              y="268"
              width="100"
              height="100"
              rx="10"
              fill="none"
              stroke="#ff5a1f"
              strokeWidth="26"
            />
            <path
              d="M256 268v100M206 318h100"
              stroke="#ff5a1f"
              strokeWidth="26"
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
            Send a parcel, Lagos to PAU
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            Sangotedo, Lekki/Ikoyi, the mainland and Ikorodu, both ways.
            Collected sealed, handed over sealed, photographed at each end.
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
