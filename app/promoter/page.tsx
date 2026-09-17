import Link from "next/link";
import PromoterLogin from "@/components/PromoterLogin";
import { currentPromoter } from "@/lib/promoter-auth";
import { promoterEarnings } from "@/lib/promoters";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import SaveButton from "@/components/SaveButton";
import { confirmPayout, saveBank, signOut } from "./actions";

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
          {naira(earnings.earned)} earned, {naira(earnings.paid)} already paid
          out to you. {naira(earnings.rate)} for every order a customer pays
          for.
        </p>
        {earnings.waiting > 0 ? (
          <p className="mt-3 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
            {naira(earnings.waiting)} more if the {earnings.chase.length} unpaid
            order{earnings.chase.length === 1 ? "" : "s"} below get paid.
          </p>
        ) : (
          <p className="mt-3 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
            Every order a customer pays for counts for you.
          </p>
        )}
      </section>

      {earnings.chase.length > 0 && (
        <section className="card space-y-2 border-amber-300 bg-amber-50">
          <div>
            <h2 className="font-bold">Ordered but not paid for</h2>
            <p className="text-sm text-muted">
              These are in runs still taking money. Each one is{" "}
              {naira(earnings.rate)} to you the moment it is paid. A nudge is
              usually all it takes: people put an order in and forget.
            </p>
          </div>
          <ul className="divide-y divide-black/5">
            {earnings.chase.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{order.name}</span>
                  <span className="block text-sm text-muted">
                    {order.label} · {naira(order.total)}
                  </span>
                </span>
                <a
                  href={whatsappTo(
                    order.phone,
                    `Hi ${order.name}, your Sudu order for ${order.label} is in but ` +
                      "not paid for yet. Pay before the cut off and it goes on the run."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip shrink-0 border-black/10 bg-white hover:border-ink/30"
                >
                  Nudge on WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {earnings.runs.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing yet. Every order a customer pays for counts for you, so this
          fills up as the next run does.
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
                    {run.orders} order{run.orders === 1 ? "" : "s"} counted
                    {run.unpaid > 0 && ` · ${run.unpaid} still waiting on the customer`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold">{naira(run.earned)}</span>
                  {run.earned > 0 && (
                    <span
                      className={`text-xs font-semibold ${
                        run.paidOut >= run.earned ? "text-green-700" : "text-muted"
                      }`}
                    >
                      {run.paidOut >= run.earned
                        ? "Paid out to you"
                        : run.paidOut > 0
                          ? `${naira(run.paidOut)} of it paid out`
                          : "Not paid out to you yet"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            An order counts once the customer has paid for it: one that never
            got paid never travelled. Paid out is the separate thing, and
            means your money has been sent.
          </p>
        </section>
      )}

      {earnings.payouts.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Paid out to you</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {earnings.payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span>
                  {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {(payout.runLabel || payout.note) && (
                    <span className="text-muted">
                      {" "}
                      · {payout.runLabel || payout.note}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{naira(payout.amount)}</span>
                  {payout.confirmed_at ? (
                    <span className="chip border-transparent bg-mint/20 text-xs font-semibold">
                      You said it landed
                    </span>
                  ) : (
                    <form action={confirmPayout}>
                      <input type="hidden" name="payout_id" value={payout.id} />
                      <SaveButton quiet className="px-3 py-1 text-xs">
                        It landed
                      </SaveButton>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action={saveBank} className="card space-y-3">
        <div>
          <h2 className="font-bold">Where your money goes</h2>
          <p className="text-sm text-muted">
            Keep this right and nobody has to ask you for it on payday.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bank_account_name">Account name</label>
            <input
              id="bank_account_name"
              name="bank_account_name"
              defaultValue={earnings.bank.accountName}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="bank_name">Bank</label>
            <input
              id="bank_name"
              name="bank_name"
              defaultValue={earnings.bank.name}
              placeholder="GTBank"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="bank_account_number">Account number</label>
            <input
              id="bank_account_number"
              name="bank_account_number"
              inputMode="numeric"
              maxLength={10}
              defaultValue={earnings.bank.accountNumber}
              className="field"
            />
          </div>
        </div>
        <SaveButton>Save</SaveButton>
      </form>

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
