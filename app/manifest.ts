import type { MetadataRoute } from "next";

/**
 * What makes the site installable on a phone's home screen.
 *
 * It exists for one reason: iOS will not deliver a web push at all unless the
 * site has been added to the Home Screen and opened from there, and it cannot
 * be added without a manifest that says `standalone`. Everything else here is
 * what the install prompt and the splash screen read.
 *
 * The icons are flattened PNGs rather than the SVG the site draws elsewhere,
 * because a home screen and a notification both want a raster and neither
 * will take a vector.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sudu",
    short_name: "Sudu",
    description:
      "KFC, Domino's, Chicken Republic and more from Sangotedo, delivered to Pan-Atlantic University.",
    start_url: "/",
    display: "standalone",
    // The page's own cream, so the splash screen is not a white flash on the
    // way into a dark header.
    background_color: "#f2efe9",
    theme_color: "#15110e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        // The same square serves both: the corners are filled, so a phone
        // that crops it to a circle has something to crop.
        purpose: "any",
      },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
