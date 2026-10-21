import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActionButton from "@/components/ActionButton";
import RunStage from "@/components/runner/RunStage";
import { SLOT_LABEL } from "@/lib/config";
import { counterMessage, expectedAt, hasGot, howToOrderAhead, runProgress } from "@/lib/runner";
import { counterContacts, runByToken } from "@/lib/runner-server";
import { whatsappTo } from "@/lib/messages";
import { runDateLabel } from "@/lib/time";
import { markStop } from "./actions";

export const dynamic = "force-dynamic";

/** Never indexed, never previewed, never in anybody's search results. */
export const metadata: Metadata = {
  title: "Tonight's run",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The run, for whoever is driving it.
 *
 * The same night as the admin sheet with everything that is not the night
 * taken out. No takings, no profit, no commission, no other run, nobody
 * who did not order on this one. What is left is the two things a person
 * in a car actually does: collect at each counter, hand over at each
 * block.
 *
 * Why it exists at all: the run sheet was behind the admin login, so the
 * only person who could drive a run was a person trusted with the whole
 * shop, which is why the runner has always been family. A link that opens
 * one night and expires with it is the smallest thing that changes that.
 *
 * It is one column on purpose. This is read at a counter with one hand
 * while a bag is coming over it, and anything that needs two taps to find
 * will be read off somebody's memory instead.
 */
export default async function RunPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const run = await runByToken(token);

  // A token that matches nothing, a run that has been settled, and a token
  // the shop has cleared all land here. They are different facts, and
  // telling them apart for somebody holding a link they should not have is
  // a courtesy to the wrong person.
  if (!run) notFound();

  const { batch, sheet } = run;
  const { counter, handout } = sheet;
  const reach = await counterContacts();
  const progress = runProgress(counter, batch.runner_got, handout);

  const when = `${runDateLabel(batch.run_date)}, ${SLOT_LABEL[batch.slot] ?? ""}`.trim();

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-5 pb-24">
      <header className="space-y-1.5">
        <p className="ticket text-[11px] text-muted">Tonight&rsquo;s run</p>
        <h1 className="font-display text-[clamp(1.9rem,8vw,2.6rem)] font-black uppercase leading-[0.92]">
          {when}
        </h1>
        <p className="text-sm text-muted">
          {batch.delivery_window_text || "Dropping at the blocks"}
        </p>

        {/*
          Two counts, because the night is two jobs and they do not overlap.
          A sheet that says "60% done" while every bag is still in the boot
          is telling somebody they are nearly finished when they have not
          started the half that people are waiting on.
        */}
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
          <span className={progress.stops === progress.ofStops ? "text-mint" : ""}>
            {progress.stops} of {progress.ofStops} stop
            {progress.ofStops === 1 ? "" : "s"} collected
          </span>
          <span className={progress.dropped === progress.ofBags ? "text-mint" : ""}>
            {progress.dropped} of {progress.ofBags} bag
            {progress.ofBags === 1 ? "" : "s"} handed over
          </span>
        </p>
      </header>

      {/*
        The same tap she makes today, on a page that needs no password.
        It leads, because it is the thing the whole run is tracked by and
        the thing customers are watching from their own order page.
      */}
      <RunStage token={token} batchId={batch.id} stage={batch.stage} />

      {/* ─── Collecting ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-black uppercase">
          What to collect
        </h2>

        {counter.length === 0 && (
          <p className="card text-sm text-muted">
            Nothing to collect on this run yet.
          </p>
        )}

        {counter.map((group, at) => {
          const got = hasGot(batch.runner_got, group.restaurant);
          const contact = reach[group.restaurant];
          const way = howToOrderAhead(contact);
          const number = contact?.phone ?? "";
          // No collection time in the message. The hour the car reaches a
          // given counter is not a thing the shop knows in advance, and a
          // time promised to a kitchen and then missed by forty minutes is
          // worse for the next order than no time at all.
          const ahead = counterMessage(group, { shopName: "Sudu", collectingAt: "" });

          return (
            <article
              key={group.restaurant}
              className={`card space-y-3 ${got ? "border-mint bg-mint/5" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-black uppercase">
                  <span className="text-muted">{at + 1}.</span> {group.restaurant}
                </h3>
                {got && (
                  <span className="ticket text-[11px] text-mint">Collected ✓</span>
                )}
              </div>

              <ul className="space-y-1.5">
                {group.lines.map((line) => (
                  <li key={line.key} className="flex gap-2.5 text-[15px]">
                    <span className="font-display font-black">{line.qty}×</span>
                    <span>
                      {line.name}
                      {line.choices.length > 0 && (
                        <span className="block text-[13px] text-muted">
                          {line.choices.join(", ")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/*
                The one figure on this page, and the only question asked at
                a card machine: is the amount on the screen the amount that
                was ordered. Everything else about money on a run is the
                shop's business and is answered afterwards.
              */}
              <p className="soft bg-shell px-3 py-2 text-sm">
                The card should be{" "}
                <span className="font-mono font-bold">{expectedAt(group)}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                {/*
                  Only the way that works. A list sent to a WhatsApp nobody
                  watches is worse than no list: the stop becomes a wait for
                  food that was never started, by somebody who thinks it was.
                */}
                {(way === "whatsapp" || way === "both") && (
                  <a
                    href={whatsappTo(number, ahead)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Send them the list
                  </a>
                )}
                {(way === "call" || way === "both") && (
                  <a
                    href={`tel:${number}`}
                    className={
                      way === "call"
                        ? "btn-primary px-4 py-2 text-sm"
                        : "btn-quiet px-4 py-2 text-sm"
                    }
                  >
                    Ring it through
                  </a>
                )}
                {way === "none" && (
                  <span className="text-[13px] text-muted">
                    Ordered at the counter. The list above is what to read
                    out.
                  </span>
                )}

                {/*
                  Optional, and quiet because of it.

                  Nothing in the shop waits on this tick. It is here so a
                  five stop run does not have to be held in somebody's head
                  while they are being handed bags, and the shop knowing
                  where the car is comes free with that. A driver who never
                  touches it still has a working list, which is the only
                  honest way to offer something that costs the person using
                  it more than it gives them.
                */}
                <form action={markStop}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="restaurant" value={group.restaurant} />
                  <input type="hidden" name="collected" value={got ? "false" : "true"} />
                  <ActionButton
                    className="text-[13px] font-semibold text-muted underline"
                    doneClassName="text-mint"
                    busy="…"
                    done={got ? "Put back" : "Ticked"}
                  >
                    {got ? "Not collected after all" : "Tick this stop off"}
                  </ActionButton>
                </form>
              </div>

            </article>
          );
        })}
      </section>

      {/* ─── Dropping ───────────────────────────────────────────────── */}
      <section className="space-y-3 pt-2">
        <h2 className="font-display text-xl font-black uppercase">
          Where it goes
        </h2>
        {/*
          A list to read, with nothing to tick.

          Every bag on the run is marked delivered by one move at the end,
          which is the move already being made. A tick per bag on top of
          that is the same fact said twice, and the second saying is the one
          that gets skipped.
        */}

        {handout.length === 0 && (
          <p className="card text-sm text-muted">
            Nothing paid for on this run yet.
          </p>
        )}

        {handout.map((bag) => {
          const done = bag.orders.every((order) => order.status === "delivered");

          return (
            <article
              key={bag.key}
              className={`card space-y-2 ${done ? "border-mint bg-mint/5" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-black uppercase">
                  {bag.name}
                </h3>
                {done && <span className="ticket text-[11px] text-mint">Handed over ✓</span>}
              </div>

              <p className="text-sm font-semibold">{bag.hostel || "No block given"}</p>

              <ul className="space-y-1 text-[14.5px]">
                {bag.lines.map((line, index) => (
                  <li key={`${bag.key}-${index}`} className="flex gap-2.5">
                    <span className="font-display font-black">{line.qty}×</span>
                    <span>
                      {line.name}
                      {line.choices.length > 0 && (
                        <span className="text-muted"> ({line.choices.join(", ")})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/*
                The number to ring on arrival. A driver outside the wrong
                block with no way to say so is the whole reason a run runs
                late, and this is the one piece of a customer's details the
                job actually needs.
              */}
              <a
                href={`tel:${bag.phone}`}
                className="inline-block text-[13px] font-semibold text-brand underline"
              >
                Ring {bag.name.split(/\s+/)[0]}
              </a>


            </article>
          );
        })}
      </section>

      <p className="pt-2 text-center text-xs text-muted">
        This link opens tonight&rsquo;s run only, and stops working once the
        run is settled.
      </p>
    </div>
  );
}
