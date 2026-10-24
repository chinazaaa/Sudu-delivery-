import Link from "next/link";
import { shortRef } from "@/lib/links";
import Empty from "@/components/Empty";
import PinForm from "@/components/PinForm";
import { currentCustomer } from "@/lib/customer-auth";
import { formatPhone } from "@/lib/phone";
import { safeSettings } from "@/lib/settings";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import RepeatOrder from "@/components/RepeatOrder";
import { ordersForPhone, repeatLines } from "@/lib/orders";
import { myPlans, nextLanding } from "@/lib/plans";
import { lagosToday, runDateLabel } from "@/lib/time";
import { STAGE_LABEL } from "@/lib/stages";
import { takesMoney } from "@/lib/batches";
import { dayWord } from "@/lib/time";
import { deleteMyData, forgetMe } from "@/app/actions";
import DeleteMyData from "@/components/DeleteMyData";
import ActionButton from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; delete?: string }>;
}) {
  const phone = await currentCustomer();
  const settings = await safeSettings();

  // Sent here from somewhere else, to come back to it. Everything that
  // needs a signed-in customer already passes this; it was being dropped
  // on the floor, which left people signed in and stranded on their own
  // order history wondering what they had clicked.
  const { next, delete: deleted } = await searchParams;
  const back = (next ?? "").startsWith("/") ? next! : "";

  /*
   * Signed in already, and sent here to sign in.
   *
   * Bouncing straight back was the obvious thing and the wrong one: the
   * reason somebody taps "sign in with your PIN" is almost always that the
   * browser is signed in as somebody else, or as a number they joined with
   * by mistake. Sending them back to the page they just left reads as the
   * link being broken, and they tap it again. So it says who it thinks they
   * are and offers both doors.
   */
  if (phone && back) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-[min(16vw,4.5rem)] font-black uppercase leading-[0.88] sm:text-[clamp(3rem,6vw,4.5rem)]">
          You are signed in
        </h1>
        <p className="text-ink/75">
          This phone is signed in as{" "}
          <span className="font-semibold">{formatPhone(phone)}</span>.
        </p>
        <div className="card space-y-3">
          <Link href={back} className="btn-primary block w-full text-center">
            Carry on as {formatPhone(phone)}
          </Link>
          <form action={forgetMe}>
            <input type="hidden" name="next" value={`/orders?next=${encodeURIComponent(back)}`} />
            <ActionButton className="btn-quiet w-full" busy="Signing out…" done="Signed out">
              Not you? Sign in with another number
            </ActionButton>
          </form>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="grid items-center gap-10 py-6 lg:grid-cols-2 lg:gap-14 lg:py-14">
        <div className="flex flex-col gap-5">
          <span className="ticket text-brand-dark">My orders</span>
          <h1 className="font-display text-[min(18vw,6.5rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.5rem,7vw,6.5rem)]">
            {back ? (
              <>
                Your number,
                <br />
                your PIN
              </>
            ) : (
              <>
                Your runs,
                <br />
                one PIN
              </>
            )}
          </h1>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-ink/80 sm:text-lg">
            {back
              ? "We already know this number, and your PIN is what proves it is yours. If you have never been sent one, ask below and it goes to your number."
              : "We sent your PIN on WhatsApp with your first order. Put it in to see every order, follow today's run, and order the same thing again in one tap."}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_#e5321d] sm:p-7 lg:shadow-[10px_10px_0_#e5321d]">
          <PinForm
            whatsapp={settings.whatsapp_number}
            next={back || undefined}
            label={back ? "Carry on" : undefined}
          />
        </div>
      </div>
    );
  }

  const orders = await ordersForPhone(phone);
  // Each order is rebuilt at today's prices so it can be repeated in one tap,
  // with anything sold out left out and named.
  const repeats = await Promise.all(orders.map((order) => repeatLines(order)));

  // What is still happening, and what has already been. An order sits at the
  // top of the page until it has been handed over, because until then it is
  // the only one anybody opened this page to look at.
  const done = (order: (typeof orders)[number]) =>
    order.status === "delivered" ||
    order.status === "refunded" ||
    order.status === "cancelled";
  const live = orders.filter((order) => !done(order));
  const past = orders.filter(done);

  /* A standing order is the one thing about an account that is not an
     order. The orders it has raised are already in the lists above, with
     the same page and the same timeline as everything else; what nobody
     could see was the arrangement behind them. */
  const standing = await myPlans(phone).catch(() => []);
  const today = lagosToday();

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[min(16vw,5.5rem)] font-black uppercase leading-[0.88] sm:text-[clamp(3.5rem,7vw,5.5rem)]">
          My orders
        </h1>
        <form action={forgetMe}>
          <ActionButton
            className="text-sm text-muted hover:underline"
            doneClassName="text-mint"
            busy="Signing out…"
            done="Signed out"
          >
            Not you?
          </ActionButton>
        </form>
      </div>

      {/* The one refusal that happens in practice: a bag with no name on
          it reaches nobody, so it waits for the food to land. Said here
          rather than swallowed, because a button that looks like it did
          nothing is a button somebody presses again. */}
      {deleted === "coming" && (
        <p className="soft border-volt-line bg-brand-tint px-4 py-3 text-[14.5px]">
          <span className="font-bold">Not yet.</span> You have an order still
          on its way, and we cannot deliver a bag with no name on it. Come back
          once it has arrived and this goes through straight away.
        </p>
      )}
      {deleted === "failed" && (
        <p className="soft border-volt-line bg-brand-tint px-4 py-3 text-[14.5px]">
          <span className="font-bold">That did not go through.</span> Message
          us and we will do it by hand.
        </p>
      )}

      {standing.map((plan) => (
        <section
          key={plan.id}
          className="card flex flex-col gap-1.5 border-l-[6px] border-l-brand p-4 sm:p-5"
        >
          <span className="ticket text-brand-dark">Your monthly box</span>
          <p className="text-[17px] font-bold">
            Next one lands {runDateLabel(nextLanding(plan, plan.madeThrough ?? today))}
          </p>
          <p className="text-sm leading-relaxed text-ink/70">
            {plan.forName === ""
              ? `To ${plan.hostel}.`
              : `For ${plan.forName} at ${plan.hostel}.`}{" "}
            We raise the order a few days before and send you what it comes to.
            Nothing is charged automatically and we do not hold a card.
            {plan.pausedUntil && plan.pausedUntil >= today
              ? ` It is paused until ${plan.pausedUntil}.`
              : ""}
          </p>
          <p className="text-sm text-muted">
            To change what is in it, the day, or to stop it, message us.
          </p>
        </section>
      ))}

      {/* The tab bar carries the group now, and the header's own link to this
          is hidden on a phone, so ordering the same thing again lives here
          where the same things are listed.

          Above the list only when nothing is on its way. With a live order
          it goes underneath: somebody with food on the road opened this page
          to find out where it is, and a card about ordering again pushed the
          answer off the screen. Two live orders pushed it further. Wanting
          it again is a thing you decide after you have been fed. */}
      {orders.length > 0 && live.length === 0 && <RepeatCard />}

      {orders.length === 0 ? (
        <Empty icon="bag" title="No orders yet" href="/" action="Browse the menu">
          Everything you order shows up here, with where it has got to and a
          button to order the same thing again.
        </Empty>
      ) : (
        <div className="space-y-8">
          {/* Still happening. On Ink with the speed stripes, because this is
              the one thing on the page somebody opened it to look at, and a
              row in a list of fifty is not where it belongs. */}
          {live.length > 0 && (
            <ul className="space-y-4">
              {live.map((order) => (
                <li key={order.id} className="space-y-2.5">
                  <Link
                    href={`/o/${shortRef(order)}`}
                    className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl bg-ink p-5 text-shell shadow-[6px_6px_0_#e5321d] sm:p-7 sm:shadow-[8px_8px_0_#e5321d]"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 -right-6 w-[26%] opacity-85"
                      style={{
                        background:
                          "repeating-linear-gradient(-60deg,#e5321d 0 6px,transparent 6px 14px)",
                      }}
                    />
                    <span className="relative flex min-w-0 flex-col gap-2.5">
                      <span className="flex flex-wrap items-center gap-2.5">
                        <Chip order={order} />
                        <span className="ticket text-[#b9b0a5]">
                          #{shortRef(order)}
                        </span>
                        {/* The same order, said from whichever side is
                            reading it. A father and his child are not two
                            customers who happen to share a block: they
                            both see this, and each of them is told which
                            of the two they are. */}
                        {between(order, phone) !== "" && (
                          <span className="ticket text-volt">
                            {between(order, phone)}
                          </span>
                        )}
                      </span>
                      <span className="font-display text-[clamp(2rem,8vw,3.25rem)] font-black uppercase leading-[0.9]">
                        {dayWord(order.batch.run_date)} run
                        {order.hostel ? ` → ${order.hostel}` : ""}
                      </span>
                      <span className="text-rail-text">
                        {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                      </span>
                    </span>
                    <span className="relative flex items-center gap-4">
                      <span className="font-display text-[32px] font-black leading-none sm:text-[40px]">
                        {naira(order.total)}
                      </span>
                      <span className="flex min-h-12 shrink-0 items-center rounded-full bg-shell px-5 font-bold text-ink">
                        {order.status === "pending" && !gone(order)
                          ? "Pay"
                          : "Track"}
                      </span>
                    </span>
                  </Link>
                  {gone(order) && (
                    <Link
                      href={`/o/${shortRef(order)}`}
                      className="btn-quiet w-full py-2.5 text-sm"
                    >
                      Move it to another run
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Under the live orders, where somebody lands once they have the
              answer they came for. */}
          {live.length > 0 && <RepeatCard />}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="ticket text-muted">Past runs</h2>
              <ul className="space-y-3">
                {past.map((order) => (
                  <li
                    key={order.id}
                    className="card flex flex-wrap items-center gap-x-6 gap-y-3 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Chip order={order} />
                        <span className="ticket text-muted">
                          {dayWord(order.batch.run_date)} ·{" "}
                          {SLOT_LABEL[order.batch.slot]}
                          {order.for_name ? ` · ${order.for_name}'s share` : ""}
                        </span>
                        {between(order, phone) !== "" && (
                          <span className="ticket text-brand-dark">
                            {between(order, phone)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/o/${shortRef(order)}`}
                        className="truncate text-[17px] font-bold hover:underline"
                      >
                        {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                      </Link>
                      {order.hostel !== "" && (
                        <span className="text-sm text-muted">{order.hostel}</span>
                      )}
                    </div>
                    <span className="font-display text-[30px] font-extrabold leading-none">
                      {naira(order.total)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/o/${shortRef(order)}`}
                        className="chip bg-transparent px-4"
                      >
                        View
                      </Link>
                      <RepeatOrder
                        lines={repeats[orders.indexOf(order)].lines}
                        blocked={repeats[orders.indexOf(order)].blocked}
                        label="Order again"
                        look="chip border-ink bg-brand px-4 text-white"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {orders.length > 0 && (
        <p className="text-sm text-muted">
          <Link href="/" className="font-semibold text-brand underline">
            Order something new
          </Link>
          , or tap &quot;Order this again&quot; on any order above.
        </p>
      )}

      {/*
        Delete everything, from here.

        The app has had this since the stores asked for it, and the
        website answered the same question with "message us from your own
        number and we will do it": the same request, a human in the way,
        and a wait while somebody is believed. It is the same deletion
        underneath, so the two can never come to mean different things.

        Said at the bottom and quietly. It is somebody's to use and
        nobody's to be nudged towards.
      */}
      <details className="border-t-[1.5px] border-rule pt-4 text-sm">
        <summary className="cursor-pointer list-none text-muted underline decoration-dotted underline-offset-4">
          Delete everything you have about me
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-muted">
            Your name, your number, your block and your PIN go, along with any
            cart you left behind. Past orders stay as a record of money that
            changed hands, with your name taken off them, which is what the{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>{" "}
            says. It cannot be undone, and we cannot do it while an order is
            still on its way.
          </p>
          <DeleteMyData action={deleteMyData} />
        </div>
      </details>
    </div>
  );
}

/**
 * An order whose run has gone: nothing more can happen to it where it is.
 *
 * The same rule the order page uses, from one place, because this said "run
 * closed, move it to pay" about orders that page was happily taking money
 * for. Every group order landed in that gap, since a group closes on the cut
 * off and writes its orders just after it.
 */
function gone(order: Awaited<ReturnType<typeof ordersForPhone>>[number]): boolean {
  return order.status === "pending" && !takesMoney(order.batch);
}

/** What has happened to an order, in one word, coloured by which word. */
function Chip({
  order,
}: {
  order: Awaited<ReturnType<typeof ordersForPhone>>[number];
}) {
  const [said, look] =
    order.status === "pending"
      ? gone(order)
        ? (["Run closed", "bg-volt text-ink"] as const)
        : (["Awaiting payment", "bg-volt text-ink"] as const)
      : order.status === "cancelled"
        ? (["Cancelled", "bg-[#4a423b] text-shell"] as const)
        : order.status === "refunded"
          ? (["Refunded", "bg-[#4a423b] text-shell"] as const)
          : order.status === "delivered"
            ? (["Delivered", "bg-mint text-white"] as const)
            : ([STAGE_LABEL[order.batch.stage], "bg-brand text-white"] as const);

  return <span className={`ticket px-2 py-1 ${look}`}>{said}</span>;
}

/**
 * Ordering the same thing again.
 *
 * Drawn in two places on this page and so written once: above the list when
 * nothing is on its way, and under the live orders when something is.
 * Somebody with food on the road opened this page to find out where it is,
 * and a card about ordering again standing over that answer pushed it off
 * the screen. Wanting it again is a thing you decide after you have been
 * fed.
 */
function RepeatCard() {
  return (
    <Link
      href="/reorder"
      className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-paper px-4 py-3"
    >
      <span>
        <span className="block font-bold">Order the same thing again</span>
        <span className="block text-sm text-muted">
          Rebuilt at today&apos;s prices, ready for the next run.
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold text-brand">Open</span>
    </Link>
  );
}

/**
 * Which side of an order the person reading it is on.
 *
 * A parent pays and a child eats, and both of them open this page with
 * their own number and their own PIN. Until now one of them saw it and the
 * other saw nothing, which made two customers out of one household and
 * left the son's own page saying he had never ordered anything.
 *
 * Now they both see it, and the only difference is the three words at the
 * top: ordered by whoever paid, or sent to whoever ate it. Empty for the
 * overwhelming majority, where one person bought their own dinner.
 */
function between(
  order: {
    customer_phone: string;
    customer_name: string;
    deliver_to_name?: string | null;
  },
  reading: string
): string {
  const first = (said: string | null | undefined) =>
    String(said ?? "").trim().split(" ")[0] ?? "";

  if (order.customer_phone !== reading) {
    const who = first(order.customer_name);
    return who === "" ? "Sent to you" : `Ordered by ${who}`;
  }

  const to = first(order.deliver_to_name);
  return to === "" ? "" : `Sent to ${to}`;
}
