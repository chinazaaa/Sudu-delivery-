import type { Metadata } from "next";
import Link from "next/link";
import MoveOrder from "@/components/MoveOrder";

export const metadata: Metadata = {
  title: "Demo: move to another day",
  robots: { index: false, follow: false },
};

const SAMPLE = [
  { id: "r1", label: "Wednesday · night", closes: "Closes 3:00 pm, Between 5pm and 7pm", fee: 4000 },
  { id: "r2", label: "Friday · afternoon", closes: "Closes 3:00 pm, Between 5pm and 7pm", fee: 4000 },
  { id: "", at: "2026-11-23T14:00:00Z", label: "Monday · own car", closes: "Between 3pm and 6pm", fee: 8000 },
  { id: "", at: "2026-11-24T14:00:00Z", label: "Tuesday · own car", closes: "Between 3pm and 6pm", fee: 8000 },
  { id: "r3", label: "Sunday · afternoon", closes: "Closes 1:00 pm, Between 3pm and 6pm", fee: 4000 },
];

export default function DemoMove() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-10">
      <p className="rounded-xl bg-volt px-3 py-2 text-sm font-bold text-ink">
        Demo: move to another day. Sample data, nothing is moved.
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[22px] font-black uppercase leading-none">Another day</h1>
        <Link href="/demo" className="text-sm font-semibold text-muted underline">
          All demos
        </Link>
      </div>
      <div className="card">
        <MoveOrder
          demo
          orderId="demo"
          total={15850}
          currentFee={4000}
          helpHref="https://wa.me/"
          runs={SAMPLE}
        />
      </div>
    </div>
  );
}
