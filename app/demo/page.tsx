import type { Metadata } from "next";
import Link from "next/link";
import { demoOrders } from "@/lib/demo-orders";

export const metadata: Metadata = {
  title: "Demo orders",
  robots: { index: false, follow: false },
};

/**
 * Sample orders to try the change screen on. Nothing here touches the shop:
 * the figures are samples and nothing is saved.
 */
export default function DemoIndex() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <div>
        <h1 className="font-display text-[26px] font-black uppercase leading-none">Demo orders</h1>
        <p className="mt-2 text-sm text-muted">
          Sample data only. Press every button: nothing is saved and nothing reaches the shop.
        </p>
      </div>

      <ul className="space-y-2">
        {demoOrders().map((one) => (
          <li key={one.slug}>
            <Link
              href={`/demo/change/${one.slug}`}
              className="block rounded-2xl border-2 border-ink bg-white px-4 py-3"
            >
              <span className="font-extrabold">{one.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{one.blurb}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/demo/move" className="block rounded-2xl border-2 border-ink bg-white px-4 py-3">
            <span className="font-extrabold">Move to another day</span>
            <span className="mt-0.5 block text-sm text-muted">
              The Move list: shared deliveries and cars of their own on days nobody shared is going,
              each with its delivery fee, plus the message-us link.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
