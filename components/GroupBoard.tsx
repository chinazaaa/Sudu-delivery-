"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishOrdering, closeSharedGroup } from "@/app/actions";
import { enterGroup, joinedViaLink, readGroup } from "./GroupLink";
import SendLink from "./SendLink";
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

const MINE = "sudu_group_mine_v1";

/** Which order on this page is the person reading it, remembered per group. */
function rememberMine(groupId: string, orderId: string): void {
  try {
    window.localStorage.setItem(MINE, JSON.stringify({ groupId, orderId }));
  } catch {
    /* Without storage the address bar still says, until they refresh. */
  }
}

function recallMine(groupId: string): string {
  try {
    const saved = JSON.parse(window.localStorage.getItem(MINE) ?? "null");
    return saved?.groupId === groupId ? String(saved.orderId ?? "") : "";
  } catch {
    return "";
  }
}

/**
 * A shared delivery while it is still filling up.
 *
 * Everybody watches the same board: who is in, who has finished, how long is
 * left. Nobody has a delivery fee yet, because it depends on who else turns up
 * and what they order. Saying that plainly is better than showing a figure
 * that is about to change.
 *
 * This is also where somebody who has just opened the link lands, so the first
 * thing it has to do is get them to their food.
 */
export default function GroupBoard({
  groupId,
  members,
  mine: fromAddress,
  closesAt,
  leaderOnServer,
  shareUrl,
  leaderName,
}: {
  groupId: string;
  members: Member[];
  /** The order the address bar says is theirs, if it says anything. */
  mine: string | null;
  closesAt: string;
  /** Whether the server can already tell the reader is the leader, which it
   *  only can once the leader has ordered. */
  leaderOnServer: boolean;
  shareUrl: string;
  leaderName: string;
}) {
  const router = useRouter();
  const [left, setLeft] = useState("");
  // So the group is asked to close once, not once a second.
  const asked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<string | null>(fromAddress);
  const [leader, setLeader] = useState(leaderOnServer);

  // Everything below runs on every render, never under a return, because a
  // hook that comes and goes takes the page down with it.
  useEffect(() => {
    if (fromAddress) {
      rememberMine(groupId, fromAddress);
      setMine(fromAddress);
    } else {
      const recalled = recallMine(groupId);
      if (recalled) setMine(recalled);
    }
  }, [groupId, fromAddress]);

  useEffect(() => {
    const here = readGroup() === groupId;

    // Told every time this page is opened, by everybody, leader included.
    // It is cheap, it is idempotent, and it is the half the checkout actually
    // reads, so it must not depend on a branch being taken.
    void fetch(`/api/party/${groupId}/enter`, { method: "POST" }).catch(() => {});

    if (here) {
      // Before the leader has ordered there is nothing on the server that says
      // whose group it is, so the browser that made the link is the only thing
      // that knows. It never guesses: making a link records it positively.
      if (!joinedViaLink()) setLeader(true);
      return;
    }

    // Opening the link is joining.
    //
    // This used to wait for "Add my food" to be tapped, which meant somebody
    // who reached the menu any other way, the logo, the bar, the back button,
    // was quietly ordering alone. Their food went in a car of its own and the
    // group sat there saying nobody had added anything, which is exactly what
    // it looked like from the inside.
    //
    // Only ever from this branch, so the person who made the link cannot be
    // demoted to a guest in their own group by reopening their own page.
    enterGroup(groupId, true);
  }, [groupId, leaderOnServer]);

  // The whole phrase, not a number somebody else prefixes, because "closes in
  // closing now" is what that costs.
  useEffect(() => {
    const tick = () => {
      const ms = new Date(closesAt).getTime() - Date.now();

      if (ms <= 0) {
        setLeft("closing now");

        // Whoever is looking closes it.
        //
        // The clock alone never did. Closing is a scheduled job, so a group
        // whose time was up sat there saying "closing now" until that job ran,
        // and if it had not been set up yet it said it for ever and nobody in
        // it could be told what they owed. The job is still what catches a
        // group nobody is watching; this catches the one somebody is staring
        // at. Closing is idempotent and claims itself in one write, so the two
        // arriving together is fine.
        if (!asked.current && members.length > 0) {
          asked.current = true;
          const form = new FormData();
          form.set("group_id", groupId);
          void closeSharedGroup(form)
            .catch(() => {
              // Let the next viewer, or the job, have a go.
              asked.current = false;
            })
            .finally(() => router.refresh());
        }
        return;
      }

      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setLeft(`closes in ${mins}m ${String(secs).padStart(2, "0")}s`);
    };
    tick();
    const clock = setInterval(tick, 1000);
    const poll = setInterval(() => router.refresh(), 10000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [closesAt, router, groupId, members.length]);

  const ready = members.filter((one) => one.done).length;
  const me = members.find((one) => one.orderId === mine) ?? null;

  const addMine = () => {
    // Joining happened on arrival. This is only the way to the menu.
    router.push("/");
  };

  const invite =
    `${leaderName} is ordering food to campus with Sudu. Add yours and we ` +
    `split one delivery fee: ${shareUrl}`;

  return (
    <div className="space-y-4">
      {/* The one thing somebody who has just opened the link came to do. */}
      {!me && (
        <section className="card space-y-2 border-2 border-brand/30 bg-brand-tint">
          <h2 className="font-bold text-brand-dark">
            {leader ? "You have not added anything yet" : `You are in ${leaderName}'s delivery`}
          </h2>
          <p className="text-sm text-ink/75">
            Anything you order from now rides in this car. You pay for your own food,
            and the delivery is one fee for the whole car, split evenly between
            everybody in it.
          </p>
          <button type="button" onClick={addMine} className="btn-primary w-full">
            Add my food
          </button>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {members.length === 0
              ? "Nobody has added food yet"
              : `${ready} of ${members.length} ready`}
          </h2>
          <span className="text-sm font-semibold text-brand-dark">
            {members.length === 0 ? "15 minutes from the first order" : left}
          </span>
        </div>

        <p className="text-sm text-muted">
          {members.length === 0
            ? "Send the link round, then add yours. The clock only starts once somebody has ordered, so take your time."
            : ready === members.length
              ? "Everybody is done, so this is closing now."
              : leader
                ? "Close it as soon as everyone has finished, or wait for the clock."
                : `Waiting for ${leaderName} to close it, or for the clock to run out.`}
        </p>

        {members.length > 0 && (
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
                      {/* Only for somebody being waited on, and only while it
                          is open. There is no other reason to have a number. */}
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
        )}
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

        {me?.done && !leader && (
          <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
            You are ready. You will get your total the moment this closes.
          </p>
        )}

        <SendLink
          message={invite}
          tone="quiet"
          label={
            members.length === 0 ? "Send the link on WhatsApp" : "Add somebody on WhatsApp"
          }
        />

        {leader && members.length > 0 && (
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
