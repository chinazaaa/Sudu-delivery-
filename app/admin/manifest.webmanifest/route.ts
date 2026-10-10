import { NextResponse } from "next/server";

/**
 * A manifest of its own for admin, so installing it gives you admin.
 *
 * A site gets one manifest, and the shop's says `start_url: "/"`, because
 * that is where a customer who installs it wants to land. The owner
 * installing the same site from the admin dashboard got the same manifest and
 * the same answer: the icon opened the landing page, with nothing on it that
 * leads back to admin.
 *
 * So admin serves its own, and its layout points at it instead. Installing
 * from any admin screen makes an icon that opens `/admin`, under its own name
 * so the two can sit on one home screen without either guessing which is
 * which. This is also what iOS wants before it will deliver a web push: the
 * notifications are admin's, and now so is the installed app they arrive in.
 *
 * Served by hand rather than through `app/manifest.ts`, because that file is
 * the site's one manifest and there is no second of it.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      name: "Sudu Admin",
      short_name: "Sudu Admin",
      description: "Runs, orders and the money behind Sudu.",
      // The whole point of this file.
      start_url: "/admin",
      // Everything under /admin, so a tap inside the app stays in the app
      // rather than bouncing out to the browser.
      scope: "/admin",
      display: "standalone",
      background_color: "#f2efe9",
      theme_color: "#15110e",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json" } }
  );
}
