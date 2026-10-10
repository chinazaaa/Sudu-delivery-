import Link from "next/link";
import PromoterLogin from "@/components/PromoterLogin";
import Wordmark from "@/components/Wordmark";
import { currentPromoter } from "@/lib/promoter-auth";
import { promoterEarnings, type PromoterRun } from "@/lib/promoters";
import { shortRef } from "@/lib/links";
import { naira } from "@/lib/money";
import { fillNudge, firstName, whatsappTo, NUDGE_TOKENS } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { publicOffer } from "@/lib/coupons";
import { safeSettings } from "@/lib/settings";
import { hasNudgeColumn } from "@/lib/health";
import SaveButton from "@/components/SaveButton";
import { confirmPayout, saveBank, saveNudge, signOut } from "./actions";
import ChangePin from "@/components/ChangePin";
import CopyText from "@/components/CopyText";

export const dynamic = "force-dynamic";

/** The board's panel heading: twenty-six, and twenty-one on a phone. */
const PANEL = "font-display text-[21px] font-black uppercase leading-none sm:text-[26px]";

/** The board draws the buttons inside a panel at forty-six. */
const MID = "min-h-[46px]";

/** How many runs stand on the page before the rest fold away. */
const FEW = 5;

/**
 * Somebody this promoter brought in, counted off the runs.
 *
 * The runs carry the first name of everybody whose order counted, so who
 * they brought and how often is already on the page, one run at a time.
 * Gathered up it answers the question they actually ask, which is whether
 * the people they shared the link with are still ordering.
 *
 * First names only, no amounts. They brought them in; they were not given
 * a phone book, and what anybody spent is not theirs to see.
 */
function whoTheyBrought(
  runs: PromoterRun[]
): { name: string; orders: number; since: string }[] {
  const seen = new Map<string, { orders: number; first: string }>();
  for (const run of runs) {
    for (const name of run.people) {
      const had = seen.get(name);
      if (!had) {
        seen.set(name, { orders: 1, first: run.runDate });
        continue;
      }
      had.orders += 1;
      if (run.runDate < had.first) had.first = run.runDate;
    }
  }
  return [...seen.entries()]
    .map(([name, one]) => ({
      name,
      orders: one.orders,
      since: new Date(one.first).toLocaleDateString("en-NG", { month: "long" }),
    }))
    .sort((a, b) => b.orders - a.orders);
}

/**
 * One page, in one column.
 *
 * It used to be three tabbed sub-pages, on the reasoning that nobody reads
 * a page and everybody looks for the one number they came for. That number
 * is the one at the top, and the tabs were hiding the rest of the answer
 * behind a second tap: what a run was worth, when it was paid, and whether
 * the person who ordered is still ordering are all the same question. The
 * board reads straight down, so it is one column with the money first.
 *
 * The chasing goes last. It is the only part that is work rather than news,
 * and a promoter opening this page has come to see what they earned.
 */
export default async function PromoterPage() {
  const code = await currentPromoter();
  const earnings = code ? await promoterEarnings(code) : null;
  // Links inside a message have to be absolute, so they come from the request.
  const site = await siteUrl().catch(() => "");
  // Read off the code, so this page cannot go on promising a discount that
  // has been switched off, run out or had its amount changed.
  const perk = await publicOffer((await safeSettings()).promoter_perk_code).catch(
    () => null
  );
  // The box only appears once the column is there, rather than offering a
  // save that throws on a database that has not had update.sql run on it.
  const canEditNudge = earnings ? await hasNudgeColumn() : false;

  /* The board's bar, edge to edge, on a page that draws its own width. */
  const bar = (
    <div className="flex items-center gap-2.5 bg-ink px-4 py-2.5 text-shell sm:px-6 sm:py-3.5">
      <Wordmark size={22} tone="light" className="sm:hidden" />
      <Wordmark size={28} tone="light" className="hidden sm:inline-flex" />
      <span className="mt-1.5 font-mono text-[9.5px] tracking-[0.1em] text-rail-faint sm:text-[10px]">
        PROMOTER
      </span>
      {earnings && (
        <form action={signOut} className="ml-auto">
          <button className="text-[13.5px] text-shell/80 hover:text-shell hover:underline">
            Sign out
          </button>
        </form>
      )}
    </div>
  );

  if (!earnings) {
    return (
      <div>
        {bar}
        <div className="mx-auto max-w-md space-y-4 px-4 py-7 sm:px-6">
          <h1 className="font-display text-[34px] font-black uppercase leading-[0.95] sm:text-[46px]">
            What you have earned
          </h1>
          <p className="hint">
            Your code and PIN show every run your orders landed in, and what each
            one is worth.
          </p>
          <PromoterLogin />
          <p className="hint text-center">
            No code yet?{" "}
            <Link
              href="/become-a-promoter"
              className="font-semibold text-brand-dark underline"
            >
              How this works
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const link = `${site}/s/${earnings.handle}`;
  const brought = whoTheyBrought(earnings.runs);
  const counted = earnings.runs.reduce((all, run) => all + run.orders, 0);
  const standing = earnings.runs.slice(0, FEW);
  const folded = earnings.runs.slice(FEW);
  const toChase = earnings.chase.length + earnings.carts.length;

  return (
    <div>
      {bar}

      <div className="mx-auto max-w-[760px] px-4 pb-12 pt-4 sm:px-6 sm:pt-7">
        <h1 className="font-display text-[34px] font-black uppercase leading-[0.95] sm:text-[46px]">
          Hello {firstName(earnings.name)}
        </h1>
        <p className="hint mt-0.5">
          Everything people you brought have ordered, and what you have been paid.
        </p>

        {/* Three numbers, each labelled, rather than one big one that needs
            reading twice. A promoter who has been paid everything sees a zero
            in the biggest type on the page and reads it as "you have nothing",
            when what it means is "we owe you nothing, and here is the ₦1,500
            you have already had". */}
        <section className="card mt-3.5 bg-brand text-white">
          <div className="flex flex-wrap gap-3.5 sm:gap-8">
            {[
              ["Earned", earnings.earned],
              ["Paid to you", earnings.paid],
              ["Still to come", earnings.owed],
            ].map(([label, figure]) => (
              <div key={String(label)} className="min-w-[92px] flex-1">
                <p className="ticket text-white/70">{label}</p>
                <p className="font-display text-[30px] font-black leading-none sm:text-[38px]">
                  {naira(Number(figure))}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-full bg-white/[0.18] px-3.5 py-2 text-sm font-semibold">
            {earnings.waiting > 0
              ? `${naira(earnings.waiting)} more if the ${earnings.chase.length} unpaid order${
                  earnings.chase.length === 1 ? "" : "s"
                } get paid.`
              : earnings.owed > 0
                ? `${naira(earnings.owed)} goes out on the next payday.`
                : "You are all paid up. Every new order adds to this."}
          </p>
        </section>

        {/* Their own front door, at the top where they will see it, because
            the whole reason it exists is that people forget to pick a name out
            of a dropdown at the end of a form. Share the link instead and
            nobody has to remember anything. */}
        <section className="card mt-3.5 border-volt-line bg-brand-tint">
          <p className="ticket text-brand-dark">Your link</p>
          <p className="mb-1.5 break-all font-mono text-[17px] font-semibold sm:text-[21px]">
            {link.replace(/^https?:\/\//, "")}
          </p>
          {perk && (
            <p className="mb-1.5 text-sm font-semibold text-brand-dark">
              Anybody who opens it gets {perk.line}.
            </p>
          )}
          <p className="mb-3 text-sm leading-relaxed">
            Share this instead of sudu.store. Anyone who orders after opening it
            counts for you, with your name already at the checkout, so nobody has
            to remember to pick it. You earn the same either way.
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyText
              value={link}
              label="Copy your link"
              look="btn-admin-go"
              className={`${MID} flex-1 sm:flex-none`}
            />
            {/* Pasting it into a chat is what actually happens to this link,
                so the page does the pasting. No number in the address: it
                opens WhatsApp and asks who to send it to. */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Order from Sudu through my link and I get credited for it: ${link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-admin ${MID} flex-1 sm:flex-none`}
            >
              Share on WhatsApp
            </a>
          </div>
        </section>

        {/* What they earn, said as two numbers rather than a clause in a
            sentence. A promoter who cannot tell you their own rate has not
            been told it. */}
        <section className="card mt-3.5">
          <h2 className={PANEL}>What you earn</h2>
          <div className="mt-2 flex items-baseline gap-3 border-t-[1.5px] border-rule py-2.5">
            <span className="flex-1">
              <strong className="text-[14.5px]">Food, skincare, parcels</strong>
              <span className="hint block">Including when they order together</span>
            </span>
            <span className="shrink-0 font-mono font-semibold">
              {naira(earnings.rate)}
            </span>
          </div>
          <div className="flex items-baseline gap-3 border-t-[1.5px] border-rule py-2.5">
            <span className="flex-1">
              <strong className="text-[14.5px]">Any packed box</strong>
              <span className="hint block">
                Care packages, hostel packs, gifts, food boxes
              </span>
            </span>
            <span className="shrink-0 font-mono font-semibold text-brand-dark">
              {naira(earnings.boxRate)}
            </span>
          </div>
          <p className="hint mt-2 leading-relaxed">
            Per order, every time they order, for as long as they keep ordering. It
            counts the moment they pay.
          </p>
        </section>

        {earnings.runs.length === 0 ? (
          <p className="card mt-3.5 text-sm text-muted">
            Nothing yet. Every order a customer pays for counts for you, so this
            fills up as the next run does.
          </p>
        ) : (
          <section className="card mt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={PANEL}>Run by run</h2>
              <span className="hint">
                {counted} order{counted === 1 ? "" : "s"} counted
              </span>
            </div>
            {standing.map((run) => (
              <RunRow key={run.batchId} run={run} />
            ))}
            {folded.length > 0 && (
              /* The board puts the older runs behind one line, which is the
                 shape of this list: the last few are news and the rest is a
                 record. Native so it works before any script loads. */
              <details className="group">
                <summary className="cursor-pointer list-none border-t-[1.5px] border-rule pt-3 text-center text-sm font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    The other {folded.length} ›
                  </span>
                  <span className="hidden group-open:inline">Hide those ‹</span>
                </summary>
                {folded.map((run) => (
                  <RunRow key={run.batchId} run={run} />
                ))}
              </details>
            )}
            <p className="hint mt-2 border-t-[1.5px] border-rule pt-2.5">
              An order counts once it is paid for. Paid out means your money has
              been sent.
            </p>
          </section>
        )}

        {earnings.payouts.length > 0 && (
          <section className="card mt-3.5">
            <h2 className={PANEL}>Paid out to you</h2>
            <p className="hint mt-0.5">
              Tap <strong>It landed</strong> when the money reaches your account.
              Anything you have not confirmed stays open for us both.
            </p>
            {earnings.payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex flex-wrap items-center gap-2.5 border-t-[1.5px] border-rule py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {(payout.runLabel || payout.note) && (
                    <p className="hint">{payout.runLabel || payout.note}</p>
                  )}
                </div>
                <span className="font-mono font-semibold">{naira(payout.amount)}</span>
                {payout.confirmed_at ? (
                  <span className="tag bg-mint-tint text-mint">you said it landed</span>
                ) : (
                  <form action={confirmPayout}>
                    <input type="hidden" name="payout_id" value={payout.id} />
                    <SaveButton look="btn-admin-go btn-admin-sm">
                      It landed
                    </SaveButton>
                  </form>
                )}
              </div>
            ))}
          </section>
        )}

        {brought.length > 0 && (
          <section className="card mt-3.5">
            <h2 className={`${PANEL} mb-2`}>Who you brought</h2>
            {brought.map((one) => (
              <div
                key={one.name}
                className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5"
              >
                <span
                  aria-hidden
                  className="size-[30px] shrink-0 rounded-full border-[1.5px] border-line bg-shell"
                />
                <div className="flex-1">
                  <strong className="text-sm">{one.name}</strong>
                  <p className="hint">
                    {one.orders} order{one.orders === 1 ? "" : "s"} since {one.since}
                  </p>
                </div>
              </div>
            ))}
            <p className="hint mt-2">
              {brought.length} {brought.length === 1 ? "person" : "people"} in all,
              by first name off the orders that counted. We never show you what
              anybody spent.
            </p>
          </section>
        )}

        {/* Theirs to keep right, and the board leaves it closed: on payday
            the only question is whether this is still the right account, and
            that is answered by reading it rather than by a row of fields. */}
        <section className="card mt-3.5">
          <h2 className={`${PANEL} mb-2`}>Where we send it</h2>
          <details>
            <summary className="soft flex cursor-pointer list-none items-center gap-2.5 bg-shell px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-base font-semibold">
                  {earnings.bank.accountNumber || "No account number yet"}
                </p>
                <p className="hint">
                  {[earnings.bank.accountName, earnings.bank.name]
                    .filter(Boolean)
                    .join(" · ") || "Put your details in so payday needs no asking"}
                </p>
              </div>
              <span className="btn-admin btn-admin-sm shrink-0">Change</span>
            </summary>

            <form action={saveBank} className="mt-3.5 space-y-3">
              <p className="hint">
                Keep this right and nobody has to ask you for it on payday.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="bank_account_name">
                    Account name
                  </label>
                  <input
                    id="bank_account_name"
                    name="bank_account_name"
                    defaultValue={earnings.bank.accountName}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="bank_name">
                    Bank
                  </label>
                  <input
                    id="bank_name"
                    name="bank_name"
                    defaultValue={earnings.bank.name}
                    placeholder="GTBank"
                    className="field"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="bank_account_number">
                    Account number
                  </label>
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
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </form>
          </details>
        </section>

        {/* Theirs to change, without asking anybody. Four digits handed over
            on WhatsApp are four digits sitting in somebody's WhatsApp, and the
            person who has to live with that is the one whose earnings are
            behind it. */}
        <div className="mt-3.5">
          <ChangePin code={earnings.code} />
        </div>

        {/* The one part of this page that is work rather than news, so it is
            last. It is not on the board, and it is real: an order nobody
            paid for is money this promoter has earned and not been given,
            and they are the one person who can get it moving. */}
        {toChase > 0 && (
          <h2 className="section-title mt-9">
            To chase <span className="text-brand">{toChase}</span>
          </h2>
        )}

        {earnings.chase.length > 0 && (
          <section className="card mt-3.5 border-volt-line bg-brand-tint">
            <h3 className={PANEL}>Ordered but not paid for</h3>
            <p className="hint mt-1">
              These are in runs still taking money. Each one is {naira(earnings.rate)}{" "}
              to you the moment it is paid. A nudge is usually all it takes: people
              put an order in and forget.
            </p>
            {earnings.chase.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-2.5 border-t-[1.5px] border-rule py-3"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[14.5px]">{order.name}</strong>
                  <span className="hint block">
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
                  className="btn-admin btn-admin-sm shrink-0"
                >
                  Nudge on WhatsApp
                </a>
              </div>
            ))}
          </section>
        )}

        {earnings.carts.length > 0 && (
          <section className="card mt-3.5">
            <h3 className={PANEL}>Filled a cart and stopped</h3>
            <p className="hint mt-1">
              These never became orders, so they are worth nothing to anybody yet. A
              word from you is usually what turns one into a {naira(earnings.rate)}.
            </p>
            {earnings.carts.map((cart) => (
              <div
                key={cart.id}
                className="flex flex-wrap items-center gap-2.5 border-t-[1.5px] border-rule py-3"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[14.5px]">
                    {cart.name || "Someone"}
                  </strong>
                  <span className="hint block">
                    {cart.items} item{cart.items === 1 ? "" : "s"} · {naira(cart.value)}
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
                  className="btn-admin btn-admin-sm shrink-0"
                >
                  Ask on WhatsApp
                </a>
              </div>
            ))}
          </section>
        )}

        {canEditNudge && (
          <form action={saveNudge} className="card mt-3.5 space-y-3">
            <div>
              <h2 className={PANEL}>What your nudge says</h2>
              <p className="hint mt-1">
                This is the message that opens in WhatsApp when you tap Nudge. Say it
                the way you would say it. Empty the box to put the standard one back.
              </p>
            </div>
            <textarea
              name="nudge_template"
              rows={5}
              defaultValue={earnings.nudge}
              className="field font-mono text-sm"
            />
            <p className="hint">
              {NUDGE_TOKENS.map((token) => `${token.token} is ${token.means}`).join(" · ")}
            </p>
            <SaveButton look="btn-admin-go">Save the wording</SaveButton>
          </form>
        )}

        <p className="hint mt-4 text-center">
          Questions about a run?{" "}
          <Link href="/" className="font-semibold text-brand-dark underline">
            The shop is here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/** One run, in the shape the board draws: what it was, and what it paid. */
function RunRow({ run }: { run: PromoterRun }) {
  return (
    <div className="flex items-start gap-3 border-t-[1.5px] border-rule py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-bold sm:text-[15px]">{run.label}</p>
        <p className="hint">
          {run.orders} order{run.orders === 1 ? "" : "s"} counted
          {run.boxes > 0 && ` · ${run.boxes} box${run.boxes === 1 ? "" : "es"}`}
          {run.unpaid > 0 && ` · ${run.unpaid} still waiting on the customer`}
          {/* Who they were. Somebody who brought two people in should be
              able to see that it was two people, and which two. */}
          {run.people.length > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-brand-dark">
                {run.people.join(", ")}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[15px] font-semibold">{naira(run.earned)}</p>
        {run.earned > 0 && (
          <p
            className={`hint ${
              run.paidOut >= run.earned ? "text-mint" : "text-muted"
            }`}
          >
            {run.paidOut >= run.earned
              ? "Paid out to you"
              : run.paidOut > 0
                ? `${naira(run.paidOut)} of it paid out`
                : "Not paid out yet"}
          </p>
        )}
      </div>
    </div>
  );
}
