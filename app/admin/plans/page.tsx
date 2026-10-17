import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  allPlans,
  planOrders,
  heldUntil,
  monthlyValue,
  nextLanding,
  owed,
  LEAD_DAYS,
  type Plan,
} from "@/lib/plans";
import { boxesAcross, liveOccasions, onShelf } from "@/lib/boxes";
import { hostelNames } from "@/lib/hostels";
import { safeSettings, numberOr } from "@/lib/settings";
import { naira } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { channelLabel } from "@/lib/came-from";
import { formatPhone } from "@/lib/phone";
import { runDateLabel, lagosToday } from "@/lib/time";
import { savePlan, deletePlan, raisePlanNow } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The standing orders, and whose is due.
 *
 * A parent is the one customer this shop has who buys the same thing every
 * month and has the money to keep doing it. All of that used to live in a
 * WhatsApp thread and somebody's memory, which is a promise to remember
 * rather than a subscription.
 *
 * Nothing on this page charges anybody. There is no card on file in this
 * shop: what a plan does is raise an ordinary order on a fixed day, a few
 * days before it lands, so there is a real total for a parent to pay by
 * transfer in the usual way. The predictable part is the shop's.
 */
export default async function PlansPage() {
  const today = lagosToday();
  const [plans, settings, shelves, hostels, value] = await Promise.all([
    allPlans(),
    safeSettings(),
    liveOccasions(),
    hostelNames(),
    monthlyValue(),
  ]);

  const collections = onShelf(shelves, "collection");
  const boxes = await boxesAcross(collections.map((one) => one.id));
  const named = new Map(boxes.map((one) => [one.id, one.name]));
  const shelfOf = new Map(collections.map((one) => [one.id, one.name]));

  const lead = Math.max(0, numberOr(settings.plan_lead_days, LEAD_DAYS));
  const shopPause = String(settings.plans_paused_until ?? "").trim();

  /* What each plan has already raised, so the card can show the orders
     rather than making somebody go and look for them. */
  const planOrdersFor = new Map(
    await Promise.all(
      plans.map(
        async (one) => [one.id, (await planOrders(one.id)).slice(0, 3)] as const
      )
    )
  );

  const live = plans.filter((one) => one.active);
  const due = live
    .map((plan) => ({ plan, cycles: owed(plan, today, lead, shopPause).raise }))
    .filter((one) => one.cycles.length > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Standing orders"
        detail="Parents who send the same thing every month. Nothing charges itself: each one raises an ordinary order a few days before it lands, and you send them the account."
        backHref="/admin"
        backLabel="Dashboard"
      />

      {/* What the whole thing is worth, counted off what each plan last
          actually cost rather than guessed. Silent until one has run,
          because a figure nobody can check is worse than no figure. */}
      {value.plans > 0 && (
        <div className="card mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3.5 sm:p-4">
          <strong className="font-display text-[28px] font-black leading-none">
            {naira(value.worth)}
          </strong>
          <span className="text-sm text-muted">
            a month across {value.plans} plan{value.plans === 1 ? "" : "s"}, at what
            each last came to.
          </span>
        </div>
      )}

      {shopPause !== "" && shopPause >= today && (
        <div className="card mb-3.5 border-l-[6px] border-l-amber p-3.5 sm:p-4">
          <p className="text-sm font-bold">Everything is held until {shopPause}</p>
          <p className="hint mt-1">
            Nothing lands before then and nothing is stored up: a month inside the
            hold does not happen. Change it under{" "}
            <Link href="/admin/settings#plans" className="font-semibold underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}

      {/* Whose is due, which is the only question this page is asked. */}
      {due.length > 0 && (
        <section className="card mb-3.5 border-l-[6px] border-l-brand p-3.5 sm:p-4">
          <h2 className="font-bold">
            {due.length} to raise
          </h2>
          <p className="hint mt-1">
            Within {lead} day{lead === 1 ? "" : "s"} of landing. Raising one makes the
            order and takes you to it, where the account and the amount are.
          </p>
          <ul className="mt-2.5 space-y-2">
            {due.map(({ plan, cycles }) => (
              <li key={plan.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-[14.5px]">
                  <strong>{plan.customerName || formatPhone(plan.customerPhone)}</strong>
                  {" · "}
                  {plan.boxId
                    ? named.get(plan.boxId) ?? "a box"
                    : plan.fromOrderRef
                      ? `order #${plan.fromOrderRef} again`
                      : "nothing in it yet"}
                  {" · lands "}
                  {runDateLabel(cycles[0])}
                </span>
                {/* A plan with nothing in it cannot raise anything, and
                    saying so here is better than a button that fails. Most
                    of these start as "we will discuss it". */}
                {plan.boxId === null && plan.fromOrderId === null ? (
                  <span className="text-[13px] font-semibold text-brand-dark">
                    Say what goes in it first
                  </span>
                ) : (
                  <form action={raisePlanNow}>
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="cycle" value={cycles[0]} />
                    <SaveButton look="btn-admin" className="btn-admin-sm">
                      Raise it
                    </SaveButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans.length === 0 ? (
        <p className="card mb-3.5 p-3.5 text-sm text-muted sm:p-4">
          No standing orders yet. A parent who messages asking for the same thing
          every month goes in below, and the box they want is whichever care
          package it is.
        </p>
      ) : (
        <ul className="mb-4 space-y-2.5">
          {plans.map((plan) => {
            const land = nextLanding(plan, plan.madeThrough ?? today);
            const held = heldUntil(plan, shopPause);
            return (
              <li key={plan.id} className="card p-3.5 sm:p-4">
                <details>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-[16px]">
                        {plan.customerName || formatPhone(plan.customerPhone)}
                      </strong>
                      <span className="text-sm text-muted">
                        {plan.active ? `Next ${runDateLabel(land)}` : "Not on"}
                      </span>
                    </div>
                    <p className="hint mt-1">
                      {formatPhone(plan.customerPhone)} ·{" "}
                      {plan.forName ? `for ${plan.forName} · ` : ""}
                      {plan.hostel}
                      {plan.boxId
                        ? ` · ${named.get(plan.boxId) ?? "a box"}`
                        : plan.fromOrderRef
                          ? ` · repeats order #${plan.fromOrderRef}`
                          : " · nothing in it yet"}
                      {plan.auto ? " · raises itself" : " · you raise it"}
                      {held !== "" && held >= today ? ` · held until ${held}` : ""}
                      {plan.cameFrom === "" ? "" : ` · from ${channelLabel(plan.cameFrom)}`}
                    </p>
                  </summary>

                  {/*
                      The two things anybody does with one of these.
                      A standing order starts as a conversation and is never
                      finished by a form: somebody has to agree what goes in
                      it and what it comes to, which happens on WhatsApp like
                      everything else here. Outside the fields, because it is
                      what you reach for first and the fields are what you
                      change afterwards.
                   */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {talkTo(plan.customerPhone, plan) && (
                      <a
                        href={talkTo(plan.customerPhone, plan)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-admin btn-admin-sm"
                      >
                        Message {plan.customerName.split(" ")[0] || "them"}
                      </a>
                    )}
                    <a
                      href={`tel:${plan.customerPhone}`}
                      className="btn-admin btn-admin-sm"
                    >
                      Call
                    </a>
                    {/* Switching it on is the moment it becomes a standing
                        order rather than somebody's enquiry, so it is one
                        press here as well as a tick in the form. */}
                    <form action={savePlan} className="contents">
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <PlanAgain plan={plan} />
                      <SaveButton
                        look="btn-admin"
                        className={`btn-admin-sm ${plan.active ? "" : "font-bold"}`}
                      >
                        {plan.active ? "Switch it off" : "Switch it on"}
                      </SaveButton>
                    </form>
                    <Link
                      href={`/admin/customers?q=${encodeURIComponent(plan.customerPhone)}`}
                      className="btn-admin btn-admin-sm"
                    >
                      Their orders
                    </Link>
                  </div>

                  {planOrdersFor.get(plan.id)?.length ? (
                    <p className="hint mt-2">
                      Raised so far:{" "}
                      {planOrdersFor.get(plan.id)!.map((one, at) => (
                        <span key={one.orderId}>
                          {at > 0 ? ", " : ""}
                          <Link
                            href={`/admin/orders/${one.orderId}`}
                            className="font-semibold text-ink underline"
                          >
                            {one.ref}
                          </Link>{" "}
                          {naira(one.total)}
                        </span>
                      ))}
                    </p>
                  ) : null}

                  <form action={savePlan} className="mt-3 space-y-3 border-t-[1.5px] border-rule pt-3">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <PlanFields
                      plan={plan}
                      boxes={boxes.map((one) => ({
                        id: one.id,
                        name: one.name,
                        shelf: shelfOf.get(one.occasion_id) ?? "",
                      }))}
                      hostels={hostels}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <SaveButton look="btn-admin-go">Save it</SaveButton>
                      <form action={deletePlan} className="ml-auto">
                        <input type="hidden" name="plan_id" value={plan.id} />
                        <ConfirmButton tone="bad" confirm="Yes, delete the plan">
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card p-3.5 sm:p-4">
        <h2 className="font-display text-[22px] font-black uppercase leading-none">
          A new standing order
        </h2>
        <p className="hint mt-1">
          Whoever pays is the customer, because it is their money being chased and
          their PIN. Whoever eats is who the driver rings and whose block it goes
          to.
        </p>
        <form action={savePlan} className="mt-3 space-y-3">
          <PlanFields
            boxes={boxes.map((one) => ({
              id: one.id,
              name: one.name,
              shelf: shelfOf.get(one.occasion_id) ?? "",
            }))}
            hostels={hostels}
          />
          <SaveButton look="btn-admin-go">Add the plan</SaveButton>
        </form>
      </section>
    </div>
  );
}

/**
 * Everything a one-press switch has to carry.
 *
 * The save action writes the whole row, so a form holding only the tick
 * would blank the name, the block and the box on its way past. These are
 * the same fields the editor below sends, hidden, so switching a plan on
 * from the top of the card changes exactly the one thing it says it does.
 */
function PlanAgain({ plan }: { plan: Plan }) {
  return (
    <>
      <input type="hidden" name="customer_name" value={plan.customerName} />
      <input type="hidden" name="customer_phone" value={plan.customerPhone} />
      <input type="hidden" name="for_name" value={plan.forName} />
      <input type="hidden" name="for_phone" value={plan.forPhone} />
      <input type="hidden" name="hostel" value={plan.hostel} />
      <input type="hidden" name="box_id" value={plan.boxId ?? ""} />
      <input type="hidden" name="from_order" value={plan.fromOrderRef ?? ""} />
      <input type="hidden" name="every" value={plan.every} />
      <input type="hidden" name="on_day" value={String(plan.onDay)} />
      <input type="hidden" name="paused_until" value={plan.pausedUntil ?? ""} />
      <input type="hidden" name="note" value={plan.note} />
      {plan.auto && <input type="hidden" name="auto" value="on" />}
      {/* The one thing it flips. */}
      {!plan.active && <input type="hidden" name="active" value="on" />}
    </>
  );
}

/**
 * The message the shop sends a parent about their standing order.
 *
 * Written for whoever is holding the phone and sent by them, like every
 * other message this shop sends: it opens the chat with the first line
 * already in it so nobody types the same sentence forty times.
 */
function talkTo(phone: string, plan: Plan): string | null {
  const first = plan.customerName.split(" ")[0] || "";
  return waLink(
    phone,
    `Hello${first === "" ? "" : ` ${first}`}, this is Sudu. About the monthly box for ` +
      `${plan.forName || "your child"}${plan.hostel === "" ? "" : ` at ${plan.hostel}`}: ` +
      "shall we go through what goes in it and what it comes to?"
  );
}

/** The one set of fields, for making and for changing: two forms holding
 *  the same twelve questions is one form that quietly falls behind. */
function PlanFields({
  plan,
  boxes,
  hostels,
}: {
  plan?: Plan;
  boxes: { id: string; name: string; shelf: string }[];
  hostels: string[];
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Who pays</label>
          <input
            name="customer_name"
            defaultValue={plan?.customerName ?? ""}
            placeholder="Their name"
            className="field field-admin"
          />
        </div>
        <div>
          <label className="label">Their number</label>
          <input
            name="customer_phone"
            inputMode="tel"
            defaultValue={plan?.customerPhone ?? ""}
            className="field field-admin"
          />
        </div>
        <div>
          <label className="label">Who it is for</label>
          <input
            name="for_name"
            defaultValue={plan?.forName ?? ""}
            placeholder="Their child"
            className="field field-admin"
          />
        </div>
        <div>
          <label className="label">Their number</label>
          <input
            name="for_phone"
            inputMode="tel"
            defaultValue={plan?.forPhone ?? ""}
            className="field field-admin"
          />
        </div>
        <div>
          <label className="label">Block</label>
          <input
            name="hostel"
            list="plan-hostels"
            defaultValue={plan?.hostel ?? ""}
            className="field field-admin"
          />
          <datalist id="plan-hostels">
            {hostels.map((one) => (
              <option key={one} value={one} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="label">What goes in it</label>
          <select
            name="box_id"
            defaultValue={plan?.boxId ?? ""}
            className="field field-admin"
          >
            <option value="">An order, named below</option>
            {boxes.map((one) => (
              <option key={one.id} value={one.id}>
                {one.shelf === "" ? one.name : `${one.shelf} · ${one.name}`}
              </option>
            ))}
          </select>
          <p className="hint mt-1">
            A box off the shelf, priced off the menu every month so it follows
            the counters.
          </p>
        </div>

        <div className="sm:col-span-2">
          {/*
              The way to do the one a parent and you talked through.
              Most of these start as "we will discuss it", and what comes of
              that discussion is an order you build by hand on the orders
              screen, with whatever was agreed in it. Naming that order here
              makes it the template: every month copies its lines, at
              whatever those things cost that month.
           */}
          <label className="label">Or repeat an order you already built</label>
          <input
            name="from_order"
            defaultValue={plan?.fromOrderRef ?? ""}
            placeholder="The order number, like 1045"
            className="field field-admin"
          />
          <p className="hint mt-1">
            For the ones you agreed over a message. Put the first one together
            on the orders screen with exactly what they want in it, then put
            its number here: each month copies those lines, priced off the menu
            that month. A box above wins if both are filled in.
          </p>
        </div>
        <div>
          <label className="label">How often</label>
          <select
            name="every"
            defaultValue={plan?.every ?? "monthly"}
            className="field field-admin"
          >
            <option value="monthly">Every month</option>
            <option value="fortnightly">Every two weeks</option>
            <option value="weekly">Every week</option>
          </select>
        </div>
        <div>
          <label className="label">Day of the month it lands</label>
          <input
            name="on_day"
            inputMode="numeric"
            defaultValue={String(plan?.onDay ?? 3)}
            className="field field-admin"
          />
          <p className="hint mt-1">
            1 to 28. Past the 28th there is no such day in February, and a plan
            that moves is not a fixed day.
          </p>
        </div>
        <div>
          <label className="label">Skip everything until</label>
          <input
            name="paused_until"
            type="date"
            defaultValue={plan?.pausedUntil ?? ""}
            className="field field-admin"
          />
          <p className="hint mt-1">
            Nothing is raised for this parent before this date. Set it to the
            end of the holidays and the months in between are skipped, not
            saved up: nobody comes back in January owing for December. Leave
            it empty and it runs every month.
          </p>
        </div>
      </div>

      <div>
        <label className="label">Anything the packer should know</label>
        <input
          name="note"
          defaultValue={plan?.note ?? ""}
          placeholder="No pepper. Leave it with the porter."
          className="field field-admin"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="active"
            defaultChecked={plan?.active ?? false}
            className="size-[18px] accent-[#e5321d]"
          />
          On
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="auto"
            defaultChecked={plan?.auto ?? false}
            className="size-[18px] accent-[#e5321d]"
          />
          Raise it without asking me
        </label>
      </div>
      <p className="hint">
        Left unticked it waits for you, which is right for a box sourced by hand
        and for a parent you have not billed before. Tick it for the regulars.
      </p>
    </>
  );
}
