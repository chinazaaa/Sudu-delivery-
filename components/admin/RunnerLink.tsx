"use client";

import { useState } from "react";

import ActionButton from "@/components/ActionButton";
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
}: {
  batchId: string;
  token: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const link =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/run/${token}`
      : token
        ? `/run/${token}`
        : "";

  return (
    <div className="space-y-2.5">
      {token ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-shell px-3 py-2 font-mono text-[12.5px]">
              {link}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(link).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  },
                  () => setCopied(false)
                );
              }}
              className={`btn-admin btn-admin-sm ${
                copied ? "!border-transparent !bg-mint !text-white" : ""
              }`}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

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
