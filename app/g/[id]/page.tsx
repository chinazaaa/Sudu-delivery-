import Link from "next/link";
import { cookies } from "next/headers";
import { groupView } from "@/lib/group-view";
import { safeSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { clockLabel, runDateLabel } from "@/lib/time";
import GroupBoard from "@/components/GroupBoard";

export const dynamic = "force-dynamic";

/**
 * A shared delivery, from inside it.
 *
 * Before it closes this is a waiting room: who is in, who has finished, how
 * long is left, and no figure for delivery because there is not one yet.
 * After it closes it is a bill: one even share each, and everybody pays their
 * own on their own order page.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ me?: string }>;
}) {
  const group = await groupView((await params).id);
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

  // Which of them is reading. Their own order page sets this when it sends
  // them here, and a friend who just ordered arrives with it in the address.
  const asked = (await searchParams).me ?? "";
  const mine =
    group.members.find((one) => one.orderId === asked)?.orderId ??
    (await cookies()).get("sudu_group_me")?.value ??
    null;
  const me = group.members.find((one) => one.orderId === mine) ?? null;

  const label = `${runDateLabel(group.batch.run_date)} · ${SLOT_LABEL[group.batch.slot]}`;
  const shareUrl = `${site}/join/${group.members[0]?.orderId ?? ""}`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
          {group.leaderName}&apos;s delivery
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {group.members.length} {group.members.length === 1 ? "person" : "people"},{" "}
          {group.items} item{group.items === 1 ? "" : "s"}
        </h1>
        <p className="text-ink/75">
          {label}, arriving {group.batch.delivery_window_text}.
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
          mine={mine}
          closesAt={group.closesAt!}
          isLeader={me?.isLeader ?? false}
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
