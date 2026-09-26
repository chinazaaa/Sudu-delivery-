import Link from "next/link";
import PromoterLogin from "@/components/PromoterLogin";
import { currentPromoter } from "@/lib/promoter-auth";
import { promoterEarnings } from "@/lib/promoters";
import { shortRef } from "@/lib/links";
import { naira } from "@/lib/money";
import { fillNudge, whatsappTo, NUDGE_TOKENS } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { hasNudgeColumn } from "@/lib/health";
import SaveButton from "@/components/SaveButton";
import { confirmPayout, saveBank, saveNudge, signOut } from "./actions";
import ChangePin from "@/components/ChangePin";

export const dynamic = "force-dynamic";

export default async function PromoterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Three short pages rather than one long one. Everything a promoter needs
  // was true and on the screen at once, which is the same as none of it
  // being on the screen: nobody reads a page, they look for the one number
  // they came for.
  const asked = (await searchParams).tab ?? "";
  const tab = asked === "chase" || asked === "you" ? asked : "money";
  const code = await currentPromoter();
  const earnings = code ? await promoterEarnings(code) : null;
  // Links inside a message have to be absolute, so they come from the request.
  const site = await siteUrl().catch(() => "");
  // The box only appears once the column is there, rather than offering a
  // save that throws on a database that has not had update.sql run on it.
  const canEditNudge = earnings ? await hasNudgeColumn() : false;

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

      <nav className="flex gap-2">
        {[
          { key: "money", label: "Earnings" },
          {
            key: "chase",
            label: `To chase${
              earnings.chase.length + earnings.carts.length > 0
                ? ` (${earnings.chase.length + earnings.carts.length})`
                : ""
            }`,
          },
          { key: "you", label: "You" },
        ].map((one) => (
          <Link
            key={one.key}
            href={one.key === "money" ? "/promoter" : `/promoter?tab=${one.key}`}
            className={`chip text-sm ${
              tab === one.key ? "border-brand bg-brand-tint font-bold text-brand-dark" : ""
            }`}
          >
            {one.label}
          </Link>
        ))}
      </nav>

      {/* Three numbers, each labelled, rather than one big one that needs
          reading twice. A promoter who has been paid everything sees a zero
          in the biggest type on the page and reads it as "you have nothing",
          when what it means is "we owe you nothing, and here is the ₦1,500
          you have already had". */}
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
              Earned
            </p>
            <p className="mt-0.5 text-2xl font-extrabold leading-tight">
              {naira(earnings.earned)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
              Paid to you
            </p>
            <p className="mt-0.5 text-2xl font-extrabold leading-tight">
              {naira(earnings.paid)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
              Still to come
            </p>
            <p className="mt-0.5 text-2xl font-extrabold leading-tight">
              {naira(earnings.owed)}
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
          {earnings.waiting > 0
            ? `${naira(earnings.waiting)} more if the ${earnings.chase.length} unpaid order${
                earnings.chase.length === 1 ? "" : "s"
              } get paid.`
            : earnings.owed > 0
              ? "Paid out on the next payday."
              : "You are all paid up. Every new order adds to this."}
        </p>
      </section>

      {/* What they earn, said as two numbers rather than a clause in a
          sentence. A promoter who cannot tell you their own rate has not
          been told it. */}
      {tab === "money" && (
        <section className="card space-y-2">
          <h2 className="font-bold">What you earn</h2>
          <div className="flex items-baseline justify-between gap-3 border-b border-black/5 pb-2">
            <span className="text-sm">
              <span className="block font-semibold">Food, skincare, parcels</span>
              <span className="block text-muted">
                Including when they order together
              </span>
            </span>
            <span className="shrink-0 text-lg font-extrabold">
              {naira(earnings.rate)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm">
              <span className="block font-semibold">Any packed box</span>
              <span className="block text-muted">
                Care packages, hostel packs, gifts, food boxes
              </span>
            </span>
            <span className="shrink-0 text-lg font-extrabold text-brand">
              {naira(earnings.boxRate)}
            </span>
          </div>
          <p className="text-xs text-muted">
            Per order, every time they order, for as long as they keep
            ordering. It counts the moment they pay.
          </p>
        </section>
      )}

      {tab === "chase" && earnings.chase.length + earnings.carts.length === 0 && (
        <p className="card text-sm text-muted">
          Nothing to chase. Everybody who ordered has paid.
        </p>
      )}

      {tab === "chase" && earnings.chase.length > 0 && (
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
                    fillNudge(earnings.nudge, {
                      name: order.name,
                      batch: order.label,
                      total: naira(order.total),
                      link: site ? `${site}/o/${shortRef(order)}` : "",
                    })
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

      {tab === "chase" && earnings.carts.length > 0 && (
        <section className="card space-y-2">
          <div>
            <h2 className="font-bold">Filled a cart and stopped</h2>
            <p className="text-sm text-muted">
              These never became orders, so they are worth nothing to anybody
              yet. A word from you is usually what turns one into a{" "}
              {naira(earnings.rate)}.
            </p>
          </div>
          <ul className="divide-y divide-black/5">
            {earnings.carts.map((cart) => (
              <li
                key={cart.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {cart.name || "Someone"}
                  </span>
                  <span className="block text-sm text-muted">
                    {cart.items} item{cart.items === 1 ? "" : "s"} ·{" "}
                    {naira(cart.value)}
                    {cart.summary && ` · ${cart.summary}`}
                  </span>
                </span>
                <a
                  href={whatsappTo(
                    cart.phone,
                    `Hi ${cart.name || "there"}, you had ${cart.items} item${
                      cart.items === 1 ? "" : "s"
                    } in your Sudu cart, ${naira(cart.value)}, and did not finish. ` +
                      "Want me to help you get it on the next run?"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip shrink-0 border-black/10 bg-white hover:border-ink/30"
                >
                  Ask on WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "money" && (earnings.runs.length === 0 ? (
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
                    {run.boxes > 0 &&
                      ` · ${run.boxes} box${run.boxes === 1 ? "" : "es"}`}
                    {run.unpaid > 0 && ` · ${run.unpaid} still waiting on the customer`}
                  </span>
                  {/* Who they were. Somebody who brought two people in
                      should be able to see that it was two people, and
                      which two. First names only: they brought them in,
                      they did not get given a phone book. */}
                  {run.people.length > 0 && (
                    <span className="mt-0.5 block text-sm text-brand-dark">
                      {run.people.join(", ")}
                    </span>
                  )}
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
            An order counts once it is paid for. Paid out means your money has
            been sent.
          </p>
        </section>
      ))}

      {tab === "money" && earnings.payouts.length > 0 && (
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

      {tab === "you" && canEditNudge && (
      <form action={saveNudge} className="card space-y-3">
        <div>
          <h2 className="font-bold">What your nudge says</h2>
          <p className="text-sm text-muted">
            This is the message that opens in WhatsApp when you tap Nudge. Say
            it the way you would say it. Empty the box to put the standard one
            back.
          </p>
        </div>
        <textarea
          name="nudge_template"
          rows={5}
          defaultValue={earnings.nudge}
          className="field font-mono text-sm"
        />
        <p className="text-xs text-muted">
          {NUDGE_TOKENS.map((token) => `${token.token} is ${token.means}`).join(" · ")}
        </p>
        <SaveButton>Save the wording</SaveButton>
      </form>
      )}

      {tab === "you" && (
      <>
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

      {/* Theirs to change, without asking anybody. Four digits handed over
          on WhatsApp are four digits sitting in somebody's WhatsApp, and the
          person who has to live with that is the one whose earnings are
          behind it. */}
      <ChangePin code={earnings.code} />
      </>
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
