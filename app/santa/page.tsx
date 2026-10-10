import type { Metadata } from "next";
import Link from "next/link";
import { createRoomAction } from "./actions";
import { currentCustomer } from "@/lib/customer-auth";
import { customerDetails } from "@/lib/customer-auth";
import { lagosToday } from "@/lib/time";
import { LEAST_MEMBERS } from "@/lib/santa";
import SantaRibbon from "@/components/SantaRibbon";

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
    <div className="-mt-4">
      <SantaRibbon />

      {/* The board's two columns: what this is on the left, the form that
          starts one on the right. */}
      <section className="grid items-start gap-10 pt-8 lg:grid-cols-2 lg:gap-14 lg:pt-14">
        <div className="flex flex-col gap-6 lg:gap-7">
          <div className="flex flex-wrap gap-2">
            <span className="ticket border-2 border-ink px-2.5 py-1.5">
              Group gifting
            </span>
            <span className="ticket inline-block -rotate-2 bg-mint px-2.5 py-1.5 text-white">
              Nobody has to shop
            </span>
          </div>

          <h1 className="font-display text-[min(21vw,9.25rem)] font-black uppercase leading-[0.84] sm:text-[clamp(5rem,10vw,9.25rem)]">
            Secret
            <br />
            <span className="text-brand">Santa</span>
          </h1>

          <p className="max-w-[500px] text-[17px] leading-relaxed text-ink/80 sm:text-xl">
            Draw names here. Everyone adds a wishlist. We find, buy and bring
            every gift to PAU on exchange day.
          </p>

          <ol className="flex flex-wrap gap-2.5">
            {["Draw names", "Add wishlists", "We buy and deliver"].map(
              (said, at) => (
                <li
                  key={said}
                  className="flex items-center gap-2.5 rounded-full bg-ink py-2 pl-2 pr-4 font-semibold text-shell"
                >
                  <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-brand font-display text-lg font-black text-white">
                    {at + 1}
                  </span>
                  {said}
                </li>
              )
            )}
          </ol>
        </div>

        <form
          action={createRoomAction}
          aria-labelledby="make-a-room"
          className="overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-lift lg:shadow-[10px_10px_0_#e5321d]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3 bg-ink px-6 py-5 text-shell">
            <h2
              id="make-a-room"
              className="font-display text-[32px] font-black uppercase leading-none sm:text-4xl"
            >
              Make a room
            </h2>
            <span className="ticket text-volt">{LEAST_MEMBERS}+ people</span>
          </div>

          <div className="flex flex-col gap-4 p-6 sm:p-7">
            {problem ? (
              <p className="rounded-xl bg-brand-tint px-3.5 py-3 font-semibold text-brand-dark">
                {problem}
              </p>
            ) : null}

            <div>
              <label className="label" htmlFor="name">
                What is the group called?
              </label>
              <input
                id="name"
                name="name"
                className="field"
                placeholder="e.g. Pearl Block B"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="budget">
                What is everyone spending?
              </label>
              <div className="flex min-h-12 items-center gap-2 rounded-[10px] border-2 border-ink bg-[#f9f7f3] px-3.5 focus-within:ring-[3px] focus-within:ring-volt">
                <span className="font-display text-[22px] font-extrabold">₦</span>
                <input
                  id="budget"
                  name="budget"
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none placeholder:text-muted/60"
                  type="number"
                  min={1000}
                  step={500}
                  placeholder="Budget per person"
                  required
                />
              </div>
              <p className="mt-1.5 text-sm text-muted">
                Everyone pays this to join. Anything unspent is refunded.
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
            <p className="-mt-1 text-sm leading-snug text-muted">
              Names are drawn when joining closes. Leave a few days before
              exchange day for us to find the gifts.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <label className="label" htmlFor="phone">
                  Your WhatsApp number
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="field"
                  inputMode="tel"
                  defaultValue={phone ?? ""}
                  placeholder="080…"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full border-2 border-ink text-lg"
            >
              Make the room
            </button>

            <p className="text-center text-sm text-ink/70">
              Already in a room? Open the link you were sent, or find it in{" "}
              <Link className="font-semibold" href="/orders">
                my orders
              </Link>
              .
            </p>
          </div>
        </form>
      </section>

      {/* How a room works, on Ink: the ticket on the left and the five steps
          down the right. */}
      <section className="bleed mt-10 bg-ink text-shell sm:mt-14">
        <div className="shell grid items-start gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div className="flex flex-col gap-7">
            <h2 className="section-title">How a room works</h2>
            <div className="relative max-w-[440px] pl-5 pt-5">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-[75%] w-[70%]"
                style={{
                  background:
                    "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
                }}
              />
              <div className="relative flex flex-col gap-3.5 rounded-2xl bg-shell p-5 text-ink shadow-[8px_8px_0_#1e7a4c]">
                <div className="flex justify-between gap-3">
                  <span className="ticket text-brand-dark">Room</span>
                  <span className="ticket text-muted">Draw on closing day</span>
                </div>
                <span className="font-display text-[34px] font-black uppercase leading-none sm:text-[40px]">
                  Your group
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="ticket text-muted">Budget</span>
                    <strong>Per person</strong>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="ticket text-muted">Joined</span>
                    <strong>{LEAST_MEMBERS}+ people</strong>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="ticket text-muted">Exchange</span>
                    <strong>Your day</strong>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-line" />
                <span className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink bg-ink font-bold text-white">
                  Share the room link
                </span>
              </div>
            </div>
          </div>

          <ol className="flex flex-col">
            {[
              ["Share one link", "Make the room and send the link to your group."],
              [
                "Pay and wishlist",
                "Everyone pays the budget to join and adds three to five things they would love.",
              ],
              [
                "Names are drawn",
                "On the closing day. You only ever see who you are buying for.",
              ],
              [
                "Pick, we shop",
                "Choose one thing from their list. We find it, buy it and bring it.",
              ],
              [
                "Exchange day",
                "Gifts arrive on the day. Any change comes back that week.",
              ],
            ].map(([said, note], at) => (
              <li
                key={said}
                className="flex gap-5 border-t border-[#3a322b] py-5 last:border-b"
              >
                <span className="min-w-14 font-display text-5xl font-black leading-[0.85] text-brand">
                  {String(at + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-lg font-bold">{said}</span>
                  <span className="leading-relaxed text-rail-text">{note}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The three things people actually ask. */}
      <section className="grid gap-4 py-12 sm:grid-cols-3 sm:py-14">
        {[
          [
            `${LEAST_MEMBERS}+`,
            "people to draw",
            `Fewer than ${LEAST_MEMBERS} by closing day? The room is cancelled and everyone gets their money back.`,
            true,
          ],
          [
            "₦0",
            "wasted",
            "Whatever is left of the budget after the gift is bought gets refunded that week.",
            false,
          ],
          [
            "1",
            "name each",
            "You only ever see who you are buying for. The surprise stays a surprise.",
            false,
          ],
        ].map(([big, said, note, volt]) => (
          <div
            key={String(said)}
            className={`flex flex-col gap-2 rounded-2xl border-2 border-ink p-6 ${
              volt ? "bg-volt" : "bg-paper"
            }`}
          >
            <span className="font-display text-[56px] font-black leading-[0.9]">
              {big}
            </span>
            <span className="text-lg font-bold">{said}</span>
            <span className={`leading-relaxed ${volt ? "" : "text-ink/70"}`}>
              {note}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
