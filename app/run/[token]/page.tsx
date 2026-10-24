import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CounterLines from "@/components/runner/CounterLines";
import RunStage from "@/components/runner/RunStage";
import RunSwitch from "@/components/runner/RunSwitch";
import type { CounterGroup } from "@/lib/admin";
import { DEFAULT_MARKUP, lineCost } from "@/lib/cost-price";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import {
  buyingDone,
  counterMessage,
  hasGot,
  howToOrderAhead,
  paysAtCounter,
  runProgress,
  whoOrdered,
  type Buyer,
} from "@/lib/runner";
import {
  counterContacts,
  notesOn,
  runByToken,
  type CounterContact,
} from "@/lib/runner-server";
import { runDateLabel } from "@/lib/time";
import Many from "@/components/Many";

export const dynamic = "force-dynamic";

/** Never indexed, never previewed, never in anybody's search results. */
export const metadata: Metadata = {
  title: "Tonight's run",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The run, for whoever is driving it.
 *
 * One stop per screen, because that is how the night happens. The first
 * cut stacked every counter down one page, which reads perfectly well at a
 * desk and is useless where it is actually used: standing at a till, one
 * hand, phone in the other, scrolling past six lines of Chicken Republic
 * to find out what Domino's wanted. Everything here is sized for that.
 * Big ticks, big boxes, one thing to do, and the thing to do next at the
 * bottom where the thumb already is.
 *
 * The stop is in the address, so one counter can be sent to somebody, and
 * so coming back mid-run lands where the night is rather than at the top.
 *
 * What is not here is as deliberate as what is. No takings, no profit, no
 * commission, no other run, nobody who did not order tonight.
 */
export default async function RunPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const run = await runByToken(token);

  /*
   * A token matching nothing says nothing, and that is the case that
   * matters: a link the shop has taken back has to look exactly like one
   * that never existed, or clearing it announces there was something
   * worth taking.
   */
  if (run.state === "unknown") notFound();

  /*
   * A good link whose night is over says so, rather than showing the same
   * blank page. Whoever holds this drove the run: they watched it happen,
   * so being told it is finished tells them nothing new, and the
   * alternative is the person who did the work getting a not-found page
   * and wondering what they have broken.
   */
  if (run.state === "finished") {
    return (
      <div className="mx-auto w-full max-w-xl space-y-3 px-4 py-10 text-center">
        <p className="ticket text-[11px] text-muted">
          {runDateLabel(run.runDate)}
        </p>
        <h1 className="font-display text-[clamp(2rem,9vw,2.8rem)] font-black uppercase leading-[0.92]">
          That run is finished
        </h1>
        <p className="text-[15px] text-muted">
          Its books are closed, so there is nothing left to collect or hand
          over here. Anything still to put right is on the shop&rsquo;s own
          sheet.
        </p>
        <p className="text-[15px] text-muted">
          A link for the next run is made the same way, and this one stops
          working on its own.
        </p>
      </div>
    );
  }

  const { batch, sheet } = run;
  const { counter, handout } = sheet;
  const reach = await counterContacts();
  // Who ordered each line, for the one stop in ten that has run out of
  // something. Built once here, because the answer lives in the bags and
  // the question gets asked at the counter.
  const buyers = whoOrdered(handout);
  // What was already written at a counter tonight, so a line she has
  // noted shows as noted rather than offering her an empty box again.
  const notes = Object.fromEntries(
    (await notesOn(batch.id)).map((note) => [note.line_key, note.said])
  );
  const progress = runProgress(counter, batch.runner_got, handout);
  // Past the counters, the stops are history. Everything that buys or
  // ticks goes quiet rather than asking after the fact.
  const shut = buyingDone(batch.stage);

  const when = `${runDateLabel(batch.run_date)}, ${SLOT_LABEL[batch.slot] ?? ""}`.trim();

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-4 pb-10">
      <header className="space-y-0.5">
        <p className="ticket text-[11px] text-muted">{when}</p>
        <p className="text-[13px] font-semibold text-muted">
          {batch.delivery_window_text || "Dropping at the blocks"}
        </p>
      </header>

      <RunStage token={token} batchId={batch.id} stage={batch.stage} />

      {/*
        Every screen of the night, built once here and switched on the
        phone. The stop used to be in the address, which is tidy and was
        unusable: this page is dynamic, so each tap re-ran the whole sheet
        against the database before anything moved.
      */}
      <RunSwitch
        stops={[
          ...counter.map((group, index) => ({
            short: String(index + 1),
            name: group.restaurant,
            got: hasGot(batch.runner_got, group.restaurant),
          })),
          { short: "Drops", name: "the drops", wide: true },
        ]}
      >
        {[
          ...counter.map((group, index) => (
            <StopScreen
              key={group.restaurant}
              token={token}
              batchId={batch.id}
              step={index + 1}
              ofStops={counter.length}
              stop={group}
              got={hasGot(batch.runner_got, group.restaurant)}
              shut={shut}
              contact={reach[group.restaurant]}
              buyers={buyers}
              notes={notes}
            />
          )),
          <section key="drops" className="space-y-3">
          <div>
            <p className="ticket text-[11px] text-muted">
              {progress.stops} of {progress.ofStops} stop
              {progress.ofStops === 1 ? "" : "s"} collected
            </p>
            <h1 className="font-display text-[clamp(2rem,9vw,2.8rem)] font-black uppercase leading-[0.92]">
              Where it goes
            </h1>
            {/*
              A list to read, with nothing to tick. Every bag is marked
              delivered by the one move at the top, which is the move
              already being made; a tick per bag is the same fact said
              twice, and the second saying is the one that gets skipped.
            */}
            <p className="mt-1 text-[13px] text-muted">
              Nothing to tick here. Setting the run to delivered at the top
              marks every bag and tells everybody.
            </p>
          </div>

          {handout.length === 0 && (
            <p className="card text-sm text-muted">
              Nothing paid for on this run yet.
            </p>
          )}

          {handout.map((bag) => (
            <article key={bag.key} className="card space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[22px] font-black uppercase leading-tight">
                  {bag.name}
                </h2>
                {bag.orders.every((order) => order.status === "delivered") && (
                  <span className="ticket text-[11px] text-mint">Delivered ✓</span>
                )}
              </div>

              <p className="text-[17px] font-bold">{bag.hostel || "No block given"}</p>

              <ul className="space-y-1.5 text-[15px]">
                {bag.lines.map((line, index) => (
                  <li key={`${bag.key}-${index}`} className="flex gap-2.5">
                    <Many qty={line.qty} small />
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
                block with no way to say so is most of why a run runs late,
                and it is the one piece of somebody's details the job needs.
              */}
              <a
                href={`tel:${bag.phone}`}
                className="btn-quiet flex w-full justify-center py-3 text-[15px]"
              >
                Ring {bag.name.split(/\s+/)[0]}
              </a>
            </article>
          ))}
          </section>,
        ]}
      </RunSwitch>

      <p className="pt-2 text-center text-xs text-muted">
        This link opens tonight&rsquo;s run only. Once the run is settled it
        says so and shows nothing else.
      </p>
    </div>
  );
}

/**
 * One counter, filling the screen.
 *
 * Its own component so the page above reads as the three things it is: a
 * stage, a row of stops, and whichever one is open. Inline it was a
 * hundred lines of nesting between the navigation and the drops, and the
 * shape of the night was invisible in the shape of the file.
 */
function StopScreen({
  token,
  batchId,
  step,
  ofStops,
  stop,
  got,
  shut,
  contact,
  buyers,
  notes,
}: {
  token: string;
  batchId: string;
  step: number;
  ofStops: number;
  stop: CounterGroup;
  got: boolean;
  /** The run has left the counters: show this stop, ask nothing of it. */
  shut: boolean;
  contact: CounterContact | undefined;
  /** Who ordered each line, by the key the line was grouped under. */
  buyers: Record<string, Buyer[]>;
  /** What was already written about a line, by the same key. */
  notes: Record<string, string>;
}) {
  const way = howToOrderAhead(contact);
  const pays = paysAtCounter(contact);
  // Every line without the markup on, which is what the till will ask for,
  // less anything this counter turned out not to have. Saying a line is
  // sold out takes it off the figure on the spot, because the card is
  // about to be handed over and the receipt will not include it either.
  const markup = contact?.markup ?? DEFAULT_MARKUP;
  const toPay = stop.lines.reduce(
    (total, line) =>
      total +
      (notes[line.key] ? 0 : lineCost(line.unitPrice, line.qty, markup)),
    0
  );
  const number = contact?.phone ?? "";
  const ahead = counterMessage(stop, { shopName: "Sudu" });

  return (
    <section className="space-y-3">
      <div>
        <p className="ticket text-[11px] text-muted">
          Stop {step} of {ofStops}
        </p>
        <h1 className="font-display text-[clamp(2rem,9vw,2.8rem)] font-black uppercase leading-[0.92]">
          {stop.restaurant}
        </h1>
      </div>

      {/*
        What the card will actually be charged, which for a long time this
        did not say.

        It showed the menu total, which is the cost with the shop's markup
        on it: she would have paid six thousand against a sheet asking for
        six thousand nine hundred, on every line, every run, and spent the
        evening correcting a difference that was never a difference. The
        customer's price belongs on the order, not at the till.

        Two sentences over it, because a stop the shop has already paid is
        a different job: collect and leave. Saying "the card should be" at
        a counter already settled is worse than saying nothing, because
        she will stand there trying to pay it.
      */}
      <div
        className={`card px-4 py-3 ${
          pays ? "border-ink bg-ink text-paper" : "border-mint bg-mint/10"
        }`}
      >
        <span className={`ticket block ${pays ? "text-rail-faint" : "text-mint"}`}>
          {pays ? "The card should be" : "Already paid by transfer"}
        </span>
        <span className="block font-display text-[44px] font-black leading-none">
          {naira(toPay)}
        </span>
        {!pays && (
          <span className="mt-0.5 block text-[13px] text-muted">
            Nothing to pay here. Check it against what they confirmed, then
            collect.
          </span>
        )}
      </div>

      {/* Ordering ahead, where the counter actually takes one. */}
      {way !== "none" ? (
        <div className="flex flex-wrap gap-2">
          {way !== "call" && (
            <a
              href={whatsappTo(number, ahead)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary grow justify-center px-4 py-3 text-[15px]"
            >
              Send them the list
            </a>
          )}
          {way !== "whatsapp" && (
            <a
              href={`tel:${number}`}
              className={`grow justify-center px-4 py-3 text-[15px] ${
                way === "call" ? "btn-primary" : "btn-quiet"
              }`}
            >
              Ring it through
            </a>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted">
          Ordered at the counter. The list below is what to read out.
        </p>
      )}

      {/*
        Everything below in the same money as the figure above it.

        The header was corrected to what the card will be charged and this
        list was not, so one screen said the card should be 7,304 and the
        total under the lines said 8,400, which is the menu. Two true
        figures, neither labelled, three centimetres apart, on the page
        somebody is holding while a cashier waits.
      */}
      <CounterLines
        token={token}
        restaurant={stop.restaurant}
        storageId={`run-${batchId}-${stop.restaurant}`}
        done={got}
        shut={shut}
        expected={toPay}
        lines={stop.lines.map((line) => ({
          key: line.key,
          name: line.name,
          choices: line.choices,
          qty: line.qty,
          shouldCost: lineCost(line.unitPrice, line.qty, markup),
          paid: line.paid,
          buyers: buyers[line.key] ?? [],
          note: notes[line.key] ?? "",
        }))}
      />

    </section>
  );
}
