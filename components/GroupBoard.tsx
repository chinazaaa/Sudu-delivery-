"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { finishOrdering, closeSharedGroup } from "@/app/actions";
import { naira } from "@/lib/money";

type Member = {
  orderId: string;
  name: string;
  items: number;
  food: number;
  done: boolean;
  paid: boolean;
  isLeader: boolean;
  phone: string;
};

/**
 * A shared delivery while it is still filling up.
 *
 * Everybody watches the same board: who is in, who has finished, how long is
 * left. Nobody has a delivery fee yet, because it depends on who else turns up
 * and what they order. Saying that plainly is better than showing a figure
 * that is about to change.
 */
export default function GroupBoard({
  groupId,
  members,
  mine,
  closesAt,
  isLeader,
  shareUrl,
  leaderName,
}: {
  groupId: string;
  members: Member[];
  /** Which of them is the person reading this, if any. */
  mine: string | null;
  closesAt: string;
  isLeader: boolean;
  shareUrl: string;
  leaderName: string;
}) {
  const router = useRouter();
  const [left, setLeft] = useState("");
  const [busy, setBusy] = useState(false);

  // The board is only true for as long as nobody else has moved, so it
  // re-reads itself while it is open.
  useEffect(() => {
    const tick = () => {
      const ms = new Date(closesAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("closing now");
        router.refresh();
        return;
      }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setLeft(`${mins}m ${String(secs).padStart(2, "0")}s`);
    };
    tick();
    const clock = setInterval(tick, 1000);
    const poll = setInterval(() => router.refresh(), 10000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [closesAt, router]);

  const ready = members.filter((one) => one.done).length;
  const me = members.find((one) => one.orderId === mine) ?? null;

  const share = async () => {
    const text =
      `Ordering food to campus with ${leaderName}. Add yours and we split one ` +
      `delivery fee: ${shareUrl}`;
    try {
      // Only `text`, which already ends in the link. Passing `url` as well
      // makes the share sheet append it a second time, so the message arrives
      // with the link in it twice.
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* Share sheet closed. */
    }
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {ready} of {members.length} ready
          </h2>
          <span className="text-sm font-semibold text-brand-dark">closes in {left}</span>
        </div>

        <p className="text-sm text-muted">
          {ready === members.length
            ? "Everybody is done, so this is closing now."
            : isLeader
              ? "Close it as soon as everyone has finished, or wait for the clock."
              : `Waiting for ${leaderName} to close it, or for the clock to run out.`}
        </p>

        <ul className="divide-y divide-black/5">
          {members.map((one) => (
            <li key={one.orderId} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-semibold">
                  {one.name}
                  {one.orderId === mine && <span className="text-muted"> · you</span>}
                </span>
                <span className="block text-xs text-muted">
                  {one.items} item{one.items === 1 ? "" : "s"} · {naira(one.food)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {one.done ? (
                  <span className="text-sm font-bold text-mint">Ready</span>
                ) : (
                  <>
                    <span className="text-sm text-muted">Still adding</span>
                    {/* Only for somebody being waited on, and only while it is
                        open. There is no other reason to have their number. */}
                    {one.phone && one.orderId !== mine && (
                      <a
                        href={`tel:${one.phone}`}
                        className="chip border-black/10 bg-white py-1 text-xs"
                      >
                        Nudge
                      </a>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Delivery is worked out when this closes</h2>
          <p className="text-sm text-muted">
            One fee for the whole car, split evenly between everybody in it. The more
            of you there are, the less each of you pays, so nobody can be told their
            share until the last person is done.
          </p>
        </div>

        {me && !me.done && (
          <form action={finishOrdering}>
            <input type="hidden" name="order_id" value={me.orderId} />
            <button type="submit" className="btn-primary w-full">
              I have finished ordering
            </button>
          </form>
        )}

        {me?.done && !isLeader && (
          <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
            You are ready. You will get your total the moment this closes.
          </p>
        )}

        <button type="button" onClick={share} className="btn-quiet w-full">
          Add somebody else
        </button>

        {isLeader && (
          <form
            action={closeSharedGroup}
            onSubmit={() => setBusy(true)}
            className="border-t border-black/10 pt-3"
          >
            <input type="hidden" name="group_id" value={groupId} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Closing…" : "Close it now and work out what we owe"}
            </button>
            <p className="mt-1 text-center text-xs text-muted">
              Nobody can add after this.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
