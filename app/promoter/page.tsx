import Link from "next/link";
import PromoterLogin from "@/components/PromoterLogin";
import { currentPromoter } from "@/lib/promoter-auth";
import { promoterEarnings } from "@/lib/promoters";
import { naira } from "@/lib/money";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function PromoterPage() {
  const code = await currentPromoter();
  const earnings = code ? await promoterEarnings(code) : null;

  if (!earnings) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">What you have earned</h1>
        <p className="text-ink/75">
          Your code and PIN show every run your orders landed in, and what each
          one is worth.
        </p>
        <PromoterLogin />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {earnings.name}&apos;s runs
        </h1>
        <form action={signOut}>
          <button className="text-sm text-muted hover:underline">Sign out</button>
        </form>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">
          Still to come to you
        </p>
        <p className="mt-1 text-3xl font-extrabold">{naira(earnings.owed)}</p>
        <p className="mt-1 text-sm text-white/85">
          {naira(earnings.earned)} earned, {naira(earnings.paid)} already paid.{" "}
          {naira(earnings.rate)} per paid order.
        </p>
        <p className="mt-3 break-all rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
          Your link: sudu-delivery.vercel.app/?ref={earnings.code}
        </p>
      </section>

      {earnings.runs.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing yet. Orders count from the moment someone uses your link, and
          keep counting every time that person orders again.
        </p>
      ) : (
        <section className="card space-y-2">
          <h2 className="font-bold">Run by run</h2>
          <ul className="divide-y divide-black/5">
            {earnings.runs.map((run) => (
              <li key={run.batchId} className="flex items-baseline justify-between gap-3 py-2.5">
                <span>
                  <span className="block font-semibold">{run.label}</span>
                  <span className="block text-sm text-muted">
                    {run.orders} paid order{run.orders === 1 ? "" : "s"}
                    {run.unpaid > 0 && ` · ${run.unpaid} not paid for yet`}
                  </span>
                </span>
                <span className="shrink-0 font-bold">{naira(run.earned)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            An order earns when it is paid for. One that never got paid never
            travelled, so it does not count.
          </p>
        </section>
      )}

      {earnings.payouts.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Paid to you</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {earnings.payouts.map((payout) => (
              <li key={payout.id} className="flex justify-between gap-3 py-2">
                <span>
                  {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {payout.note && <span className="text-muted"> · {payout.note}</span>}
                </span>
                <span className="font-semibold">{naira(payout.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted">
        Questions about a run?{" "}
        <Link href="/" className="font-semibold text-brand underline">
          The shop is here
        </Link>
        .
      </p>
    </div>
  );
}
