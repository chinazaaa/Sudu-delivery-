import Link from "next/link";
import { groupView } from "@/lib/group-view";
import { cookies } from "next/headers";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import GroupBoard from "@/components/GroupBoard";
import ClearCartKeepGroup from "@/components/ClearCartKeepGroup";

export const dynamic = "force-dynamic";

/**
 * A shared delivery, and the page the link lands on.
 *
 * Before it closes this is a waiting room: who is in, who has finished, how
 * long is left, and no figure for delivery because there is not one yet.
 * After it closes it is a bill: one even share each, and everybody pays their
 * own on their own order page.
 *
 * The group exists from the moment the link is made, so this page is never a
 * dead end: somebody who opens the link sees whose group it is and when the
 * food lands before they have ordered anything at all.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ me?: string; placed?: string }>;
}) {
  const query = await searchParams;
  // The seat this browser holds. Read here rather than passed about, so the
  // page can show somebody their own row without anybody else's token ever
  // reaching a browser.
  const seat = (await cookies()).get("sudu_seat")?.value ?? "";
  const group = await groupView((await params).id, seat);
  const settings = await safeSettings();
  const site = await siteUrl();

  if (!group) {
    return (
      <div className="card mx-auto mt-10 max-w-md space-y-2 text-center">
        <h1 className="text-xl font-bold">That group is not there</h1>
        <p className="text-sm text-muted">
          The link may be from an old run. Have a look at what is open now.
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block">
          See the menu
        </Link>
      </div>
    );
  }

  // Which of them is reading. Their own order sets this when it sends them
  // here; the board remembers it after that.
  const asked = query.me ?? "";
  const me =
    group.members.find((one) => one.isMine) ??
    group.members.find((one) => one.orderId === asked) ??
    null;
  const mine = me?.orderId ?? null;

  // A group that picked a time says the time and nothing else. Putting a run
  // beside it reads as a second option, and there is not one.
  const label = group.sameDay
    ? ""
    : `${runDateLabel(group.batch.run_date)} · ${SLOT_LABEL[group.batch.slot]}`;
  const shareUrl = `${site}/g/${group.id}`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {query.placed === "1" && <ClearCartKeepGroup />}
      <section className="card space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
          {group.leaderName}&apos;s delivery
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {group.members.length === 0
            ? "Waiting for the first order"
            : `${group.members.length} ${group.members.length === 1 ? "person" : "people"}, ${group.items} item${group.items === 1 ? "" : "s"}`}
        </h1>
        <p className="text-ink/75">
          {label && `${label}, `}arriving {group.batch.delivery_window_text}.
        </p>
      </section>

      {group.closedAt ? (
        <>
          <section className="card space-y-3">
            <div>
              <h2 className="font-bold">Closed. Here is the split</h2>
              <p className="text-sm text-muted">
                One delivery fee for the whole car, divided evenly between the{" "}
                {group.members.length} of you.
              </p>
            </div>
            <p className="text-3xl font-extrabold text-brand-dark">
              {naira(group.share)} each
            </p>
            <ul className="divide-y divide-black/5 text-sm">
              {group.members.map((one) => (
                <li key={one.orderId} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold">{one.name}</span>
                    <span className="block text-xs text-muted">
                      {naira(one.food)} food + {naira(group.share)} delivery
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-bold">{naira(one.food + group.share)}</span>
                    {one.paid ? (
                      <span className="text-xs font-bold text-mint">Paid</span>
                    ) : (
                      <Link
                        href={`/o/${one.orderId}`}
                        className="text-xs font-semibold text-brand"
                      >
                        {one.orderId === mine ? "Pay yours" : "Open"}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {me && !me.paid && (
            <Link href={`/o/${me.orderId}`} className="btn-primary block w-full text-center">
              Pay my {naira(me.food + group.share)}
            </Link>
          )}
        </>
      ) : (
        <GroupBoard
          groupId={group.id}
          members={group.members}
          mine={group.mine}
          hostels={await hostelNames()}
          closesAt={group.closesAt!}
          leaderOnServer={me?.isLeader ?? false}
          shareUrl={shareUrl}
          leaderName={group.leaderName}
        />
      )}

      {settings.whatsapp_number && (
        <p className="text-center text-xs text-muted">
          Something not right? Message us on {settings.whatsapp_number}.
        </p>
      )}
    </div>
  );
}
