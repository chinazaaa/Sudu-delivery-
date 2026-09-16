import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { instagramLink, safeSettings } from "@/lib/settings";
import { openRestaurants } from "@/lib/menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudu Delivery, PAU",
  description:
    "KFC and Domino's from Sangotedo, delivered to Pan-Atlantic University. One price, one payment, one run.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, restaurants] = await Promise.all([safeSettings(), openRestaurants()]);
  const instagram = instagramLink(settings.instagram_handle);
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <SiteHeader restaurants={restaurants} />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5">{children}</main>
        <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-10 text-xs text-muted">
          <p>
            Sangotedo to Pan-Atlantic University. Paid orders only, refunds the same
            night.
          </p>
          {(instagram || settings.whatsapp_group_link) && (
            <p className="flex gap-4">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="underline">
                  Instagram
                </a>
              )}
              {settings.whatsapp_group_link && (
                <a
                  href={settings.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  PAU WhatsApp group
                </a>
              )}
            </p>
          )}
        </footer>
      </body>
    </html>
  );
}
