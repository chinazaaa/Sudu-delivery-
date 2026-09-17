import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import SiteHeader from "@/components/SiteHeader";
import { instagramLink, safeSettings } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudu Delivery, PAU",
  description:
    "KFC and Domino's from Sangotedo, delivered to Pan-Atlantic University. One price, one payment, one run.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await safeSettings();
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
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:pb-24">{children}</main>
        {/* Clears both the tab bar and a sticky cart bar, which were sitting
            on top of this line. */}
        <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-44 pt-2 text-xs text-muted sm:pb-32">
          <p>{settings.footer_line}</p>
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
        <BottomNav />
      </body>
    </html>
  );
}
