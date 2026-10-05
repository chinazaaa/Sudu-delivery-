import type { Metadata } from "next";
import Link from "next/link";
import { createRoomAction } from "./actions";
import { currentCustomer } from "@/lib/customer-auth";
import { customerDetails } from "@/lib/customer-auth";
import { lagosToday } from "@/lib/time";
import { LEAST_MEMBERS } from "@/lib/santa";
import SantaHero from "@/components/SantaHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secret Santa",
  description:
    "Run your group's Secret Santa here. Everyone pays once, adds a wishlist, and we source and deliver every gift on the day.",
};

/**
 * Where a room starts.
 *
 * The page has one job: get somebody to a share link they can paste into
 * their class group. Everything else about the service is explained on the
 * room page, where there is a reason to read it.
 */
export default async function SantaPage({
  searchParams,
}: {
  searchParams: Promise<{ problem?: string }>;
}) {
  const { problem } = await searchParams;
  const phone = await currentCustomer();
  const known = phone ? await customerDetails(phone) : null;

  const today = lagosToday();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <SantaHero
        kicker="Sudu"
        title="Secret Santa"
        chips={["Draw names", "Everyone adds a wishlist", "We buy and deliver"]}
      />
      <p className="mt-4 text-muted">
        Your group draws names here. Everyone adds a wishlist, and we find, buy
        and deliver every gift on the day. Nobody has to shop for anything.
      </p>

      {problem ? (
        <p className="card mt-4 border-brand/30 bg-brand/5 font-semibold text-brand">
          {problem}
        </p>
      ) : null}

      <form action={createRoomAction} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            What is the group called?
          </label>
          <input
            id="name"
            name="name"
            className="field"
            placeholder="Accounting 400 level"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="budget">
            What is everyone spending?
          </label>
          <input
            id="budget"
            name="budget"
            className="field"
            type="number"
            min={1000}
            step={500}
            placeholder="40000"
            required
          />
          <p className="mt-1.5 text-sm text-muted">
            Everyone pays this when they join, and we give back whatever the
            gift does not use.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="closeDate">
              Last day to join
            </label>
            <input
              id="closeDate"
              name="closeDate"
              className="field"
              type="date"
              min={today}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="exchangeDate">
              Exchange day
            </label>
            <input
              id="exchangeDate"
              name="exchangeDate"
              className="field"
              type="date"
              min={today}
              required
            />
          </div>
        </div>
        <p className="text-sm text-muted">
          Names are drawn when joining closes, so leave us enough days between
          the two to find everything and bring it.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Your number
            </label>
            <input
              id="phone"
              name="phone"
              className="field"
              inputMode="tel"
              defaultValue={phone ?? ""}
              placeholder="0801 234 5678"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="yourName">
              Your name
            </label>
            <input
              id="yourName"
              name="yourName"
              className="field"
              defaultValue={known?.name ?? ""}
              placeholder="Temi"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Make the room
        </button>
      </form>

      <div className="card mt-6">
        <h2 className="font-bold">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>You get a link. Share it with the group.</li>
          <li>Everyone pays the budget to join, and adds three to five things they would like.</li>
          <li>
            On your close date the names are drawn. You see only the person you
            are buying for, never who has you.
          </li>
          <li>You pick something off their list. We find it, buy it and bring it.</li>
          <li>Everything arrives on the exchange day, and the change comes back to you that week.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          A room needs {LEAST_MEMBERS} people to draw. Below that it refunds and
          nothing happens.
        </p>
      </div>

      <p className="mt-6 text-sm text-muted">
        Already in a room? Open the link somebody sent you, or{" "}
        <Link className="font-semibold text-brand" href="/orders">
          sign in
        </Link>{" "}
        to find it.
      </p>
    </div>
  );
}
