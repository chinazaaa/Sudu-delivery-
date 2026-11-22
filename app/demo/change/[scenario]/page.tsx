import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChangeOrder from "@/components/ChangeOrder";
import { demoOrders } from "@/lib/demo-orders";

export const metadata: Metadata = {
  title: "Demo: change this order",
  robots: { index: false, follow: false },
};

export default async function DemoChange({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = await params;
  const order = demoOrders().find((one) => one.slug === scenario);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-6">
      <p className="rounded-xl bg-volt px-3 py-2 text-sm font-bold text-ink">
        Demo: {order.title}. Sample data, nothing is saved.
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[22px] font-black uppercase leading-none">
          Change this order
        </h1>
        <Link href="/demo" className="text-sm font-semibold text-muted underline">
          All demos
        </Link>
      </div>
      <ChangeOrder demo orderId="demo" backHref="/demo" total={order.total} lines={order.lines} />
    </div>
  );
}
