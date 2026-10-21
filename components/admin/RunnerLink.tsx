"use client";

import { useEffect, useState } from "react";

import ActionButton from "@/components/ActionButton";
import SendLink from "@/components/SendLink";
import { clearRunnerLink, makeRunnerLink } from "@/app/admin/actions";

/**
 * The link that lets somebody else drive tonight.
 *
 * Deliberately plain, and deliberately next to the run it belongs to. A
 * page of links to every run would be a page where the wrong one gets
 * copied, and the cost of copying the wrong one is a stranger holding a
 * different night's names.
 *
 * What it says about reach matters more than how it looks. Whoever holds
 * this can see what to buy, who it goes to, and the number to ring on
 * arrival. They cannot see the takings, the profit, another run, or
 * anybody who did not order on this one, and the link dies with the run.
 * Somebody deciding whether to send it to a new driver should be able to
 * read all of that without leaving the page.
 */
export default function RunnerLink({
  batchId,
  token,
  when,
}: {
  batchId: string;
  token: string | null;
  /** Which run this is, so the message says what is being sent. */
  when: string;
}) {
  /*
   * The address, read after the page is up rather than during it.
   *
   * It has to be absolute: this is pasted into a chat and opened on
   * somebody else's phone, where a path on its own means nothing. Reading
   * window during the render would mean the server and the browser
   * printing different things, which React is right to complain about.
   */
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const link = token ? `${origin}/run/${token}` : "";

  return (
    <div className="space-y-2.5">
      {token ? (
        <>
          {/*
            The shop's own way of sending a link, rather than a second one
            invented here. Nearly every link Sudu sends goes into a
            WhatsApp chat, so that is the named button; copy is for
            everywhere else. The sheet is deliberately not offered, for
            the reasons written on the component itself.
          */}
          <SendLink
            tone="quiet"
            label="Send it on WhatsApp"
            link={link}
            message={`Tonight's run, ${when}. Everything to collect, what the card should be, and where it all goes: ${link}`}
          />

          <code className="block truncate rounded-lg bg-shell px-3 py-2 font-mono text-[12.5px]">
            {link}
          </code>

          <p className="text-[12.5px] text-muted">
            Whoever has this can see what to collect, who it goes to and the
            number to ring. Not the takings, not another run, and not anybody
            who did not order tonight. It stops working when this run is
            settled.
          </p>

          <div className="flex flex-wrap gap-2">
            <form action={makeRunnerLink}>
              <input type="hidden" name="batch_id" value={batchId} />
              <ActionButton busy="Making…" done="New link ✓">
                Make a new one
              </ActionButton>
            </form>
            <form action={clearRunnerLink}>
              <input type="hidden" name="batch_id" value={batchId} />
              <ActionButton
                className="text-[13px] font-semibold text-red-700"
                doneClassName="text-mint"
                busy="Clearing…"
                done="Cleared ✓"
              >
                Take it back
              </ActionButton>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] text-muted">
            Nobody but the shop can open this run. Make a link and whoever is
            driving can work it from their own phone without an admin
            password.
          </p>
          <form action={makeRunnerLink}>
            <input type="hidden" name="batch_id" value={batchId} />
            <ActionButton className="btn-admin btn-admin-go" busy="Making…" done="Made ✓">
              Make a driver link
            </ActionButton>
          </form>
        </>
      )}
    </div>
  );
}
