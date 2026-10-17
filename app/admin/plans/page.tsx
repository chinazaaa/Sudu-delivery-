import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  allPlans,
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
                  {plan.boxId ? named.get(plan.boxId) ?? "a box" : "last order again"}
                  {" · lands "}
                  {runDateLabel(cycles[0])}
                </span>
                <form action={raisePlanNow}>
                  <input type="hidden" name="plan_id" value={plan.id} />
                  <input type="hidden" name="cycle" value={cycles[0]} />
                  <SaveButton look="btn-admin" className="btn-admin-sm">
                    Raise it
                  </SaveButton>
                </form>
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
                      {plan.forName ? `For ${plan.forName} · ` : ""}
                      {plan.hostel}
                      {plan.boxId ? ` · ${named.get(plan.boxId) ?? "a box"}` : ""}
                      {plan.auto ? " · raises itself" : " · you raise it"}
                      {held !== "" && held >= today ? ` · held until ${held}` : ""}
                    </p>
                  </summary>

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
        <div>
          <label className="label">What goes in it</label>
          <select
            name="box_id"
            defaultValue={plan?.boxId ?? ""}
            className="field field-admin"
          >
            <option value="">Nothing yet</option>
            {boxes.map((one) => (
              <option key={one.id} value={one.id}>
                {one.shelf === "" ? one.name : `${one.shelf} · ${one.name}`}
              </option>
            ))}
          </select>
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
          <label className="label">Hold it until</label>
          <input
            name="paused_until"
            type="date"
            defaultValue={plan?.pausedUntil ?? ""}
            className="field field-admin"
          />
          <p className="hint mt-1">
            For this one parent. A month inside the hold does not happen and is
            not stored up.
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
