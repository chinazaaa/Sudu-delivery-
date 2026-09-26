import { ImageResponse } from "next/og";

import { occasionBySlug } from "@/lib/boxes";

/**
 * The card WhatsApp draws for one collection.
 *
 * A link to the monthly foodstuff drew the shop's own card, which says we
 * deliver favourite foods to PAU. Somebody sends their mother a link about a
 * month of groceries and what lands is an advert for fried chicken.
 *
 * Drawn from the collection itself rather than kept as a file, so a
 * collection added tomorrow has a card that afternoon with nobody making
 * one.
 */
export const alt = "A Sudu collection, delivered to PAU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CollectionCard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const shelf = await occasionBySlug((await params).slug).catch(() => null);

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
              fontSize: 78,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {shelf?.name ?? "Boxes already put together"}
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>
            {shelf?.blurb ||
              "Packed here, one price with delivery in it, to their block at PAU."}
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
