import { ImageResponse } from "next/og";

/**
 * The card WhatsApp draws when somebody pastes the link into a group.
 *
 * That is how nearly everyone arrives here, so a bare grey box with a URL in
 * it is a missed introduction. Drawn rather than stored as a file: the words
 * are the shop's own, and one less thing to re-export when they change.
 */
export const alt = "Sudu, Sangotedo to Pan-Atlantic University";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: "#ff5a1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            S
          </div>
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
            Your fav foods, delivered to PAU
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            KFC, Domino&apos;s, Chicken Republic and more from Sangotedo. One
            payment, one run.
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
