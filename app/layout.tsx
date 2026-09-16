import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudu Delivery — PAU",
  description:
    "KFC and Domino's from Sangotedo, delivered to Pan-Atlantic University. One price, one payment, one run.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Sudu <span className="text-brand">Delivery</span>
            </Link>
            <Link href="/reorder" className="text-sm font-medium text-brand hover:underline">
              Order again
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-ink/50">
          Sangotedo → Pan-Atlantic University. Paid orders only; refunds the same night.
        </footer>
      </body>
    </html>
  );
}
