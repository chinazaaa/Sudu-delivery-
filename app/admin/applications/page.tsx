import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import { everyApplication } from "@/lib/promoter-applications";
import { promoterRows } from "@/lib/admin";
import { formatPhone } from "@/lib/phone";
import { whatsappTo } from "@/lib/messages";
import { agoLabel } from "@/lib/time";
import { decideApplication } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The cuts of the list, in the board's order.
 *
 * Waiting leads and is what the page opens on, because an application
 * nobody answered is worse than one turned down. The answered ones stay
 * reachable: next term the question is often whether somebody turned down
 * in October is worth a yes now.
 */
const VIEWS = [
  { value: "", label: "Waiting" },
  { value: "setup", label: "Set up" },
  { value: "declined", label: "Turned down" },
  { value: "all", label: "Everything" },
] as const;

/**
 * People asking to promote the shop.
 *
 * Approving writes a promoter and nothing else. The link and the PIN go
 * out on WhatsApp by hand from the promoters page, like every other message
 * this shop sends, which is what the three steps on the right say.
 */
export default async function ApplicationsAdmin({
  searchParams,
}: {
  /** Which cut of the list. It lives in the address so a filtered page can
   *  be come back to and reloaded. */
  searchParams: Promise<{ view?: string }>;
}) {
  const asked = await searchParams;
  const view = VIEWS.some((one) => one.value === asked.view) ? (asked.view as string) : "";

  const all = await everyApplication().catch(() => []);
  const waiting = all.filter((one) => one.status === "new");
  const approved = all.filter((one) => one.status === "approved");
  const declined = all.filter((one) => one.status !== "new" && one.status !== "approved");

  // Who is already promoting, for the sentence on the right. It is the one
  // number that says whether setting somebody up is worth doing again: five
  // codes handed out that never brought anybody is five conversations that
  // went nowhere.
  const promoters = await promoterRows().catch(() => []);
  const idle = promoters.filter((one) => one.orders === 0).length;

  const shown =
    view === "setup"
      ? approved
      : view === "declined"
        ? declined
        : view === "all"
          ? all
          : waiting;
  const counts: Record<string, number> = {
    "": waiting.length,
    setup: approved.length,
    declined: declined.length,
    all: all.length,
  };

  // Oldest waiting first: they have waited longest. Every other cut reads
  // newest first, because what was decided last is what is being checked.
  const order =
    view === ""
      ? [...shown].sort((a, b) => a.created_at.localeCompare(b.created_at))
      : shown;

  const month = new Date().toISOString().slice(0, 7);
  const setUpThisMonth = approved.filter((one) =>
    (one.decided_at ?? one.created_at).startsWith(month)
  ).length;
  const oldest = order.find((one) => one.status === "new");

  return (
    <div>
      <PageHeader
        title="Applications"
        detail="People asking to promote, from the page that offers it. Setting somebody up gives them a code, a PIN and their link."
        actions={
          <>
            <Link href="/become-a-promoter" className="btn-admin">
              See the page they filled in
            </Link>
            {/* Somebody who asked in person never fills the form in, and the
                form is the only thing that writes a row here. Adding them is
                the promoters page, which is also where their details are
                sent from. */}
            <Link href="/admin/promoters" className="btn-admin">
              Add somebody by hand
            </Link>
          </>
        }
      />

      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Waiting on you"
          value={String(waiting.length)}
          tone={waiting.length > 0 ? "brand" : "ink"}
          detail={
            oldest
              ? `Oldest asked ${agoLabel(oldest.created_at)}`
              : "Nobody is waiting on you"
          }
        />
        <Figure
          label="Set up"
          value={String(approved.length)}
          tone="mint"
          detail={
            approved.length === 0
              ? "Nobody has been given a code from here yet"
              : `${setUpThisMonth} this month`
          }
        />
        <Figure
          label="Asked in all"
          value={String(all.length)}
          detail="Since the page went up"
        />
        <Figure
          label="Turned down"
          value={String(declined.length)}
          detail="Nothing is sent automatically"
        />
      </div>

      {/* The cuts as links rather than a dropdown: the counts are the point,
          and a count inside a closed select is a count nobody reads. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((one) => (
          <Link
            key={one.value || "waiting"}
            href={one.value === "" ? "/admin/applications" : `/admin/applications?view=${one.value}`}
            className={`pill-admin ${view === one.value ? "pill-admin-on" : ""}`}
          >
            {one.label}
            <span className="font-mono opacity-60">{counts[one.value] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {order.length === 0 ? (
            <p className="card text-sm text-muted">
              {view === ""
                ? "Nobody is waiting."
                : "Nothing in that part of the list yet."}{" "}
              Applications land here the moment somebody fills the form in on{" "}
              <Link href="/become-a-promoter" className="font-semibold text-brand-dark underline">
                become a promoter
              </Link>
              .
            </p>
          ) : (
            order.map((one) => {
              const open = one.status === "new";
              const first = one.name.split(" ")[0];
              return (
                <article key={one.id} className={`card ${open ? "" : "opacity-[0.72]"}`}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <strong className="text-[17px]">{one.name}</strong>
                    {open ? (
                      <span className="tag bg-brand-tint text-amber-deep">waiting</span>
                    ) : one.status === "approved" ? (
                      <span className="tag bg-mint-tint text-mint">set up</span>
                    ) : (
                      <span className="tag bg-wash text-ink">turned down</span>
                    )}
                    {/* Every row here came through the form: it is the only
                        thing that writes one. Somebody who asked on WhatsApp
                        is added by hand on the promoters page. */}
                    <span className="tag bg-wash text-ink">Form</span>
                    <span className="hint ml-auto">{agoLabel(one.created_at)}</span>
                  </div>

                  <p className="mt-1 font-mono text-[12.5px] text-muted">
                    {formatPhone(one.phone)}
                    {one.status === "approved" && one.code !== "" && ` · ${one.code}`}
                  </p>

                  <div className="soft mt-2 bg-shell px-3 py-2.5 text-[13.5px] leading-[1.45]">
                    <span className="ticket text-muted">Who they will share it with</span>
                    <p className="mt-0.5 font-semibold">{one.reach}</p>
                  </div>

                  {one.said.trim() !== "" && (
                    <p className="mt-2 border-l-4 border-volt bg-brand-tint px-3.5 py-2.5 text-[13.5px] leading-[1.45]">
                      {one.said}
                    </p>
                  )}

                  {open && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t-[1.5px] border-rule pt-3">
                      {/* The one red thing on the page: it is what the page
                          exists to do. */}
                      <form action={decideApplication}>
                        <input type="hidden" name="id" value={one.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <SaveButton look="btn-admin-go">Set them up</SaveButton>
                      </form>
                      <a href={`tel:${one.phone}`} className="btn-admin">
                        Call
                      </a>
                      <a
                        href={whatsappTo(one.phone, `Hi ${first},`)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-admin"
                      >
                        WhatsApp
                      </a>
                      {/* Turning somebody down is not destructive and not
                          forever: it keeps the application, and the Turned
                          down cut is where it is reconsidered. So it is a
                          quiet button on the far side rather than a red
                          one. */}
                      <form action={decideApplication} className="sm:ml-auto">
                        <input type="hidden" name="id" value={one.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <SaveButton look="btn-admin" className="border-line text-muted">
                          Not now
                        </SaveButton>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Setting somebody up" detail="What happens when you tap it.">
            <ol className="mt-1">
              {[
                {
                  what: "Their code and PIN are made",
                  how: "From their name, if that code is free, with four digits to sign in with.",
                },
                {
                  what: "They start on the usual rates",
                  how: "₦500 an order, ₦1,000 a box. Change it per person on the promoters page.",
                },
                {
                  what: "You send their details",
                  how: "Their code, PIN and link written out on the promoters page, ready to send.",
                },
              ].map((step, at) => (
                <li
                  key={step.what}
                  className="flex gap-2.5 border-t-[1.5px] border-rule py-2.5"
                >
                  <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-ink font-mono text-[11px] text-shell">
                    {at + 1}
                  </span>
                  <span className="flex-1">
                    <strong className="text-sm">{step.what}</strong>
                    <span className="hint block">{step.how}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="hint mt-2.5">
              Nothing is sent until you tap send. &ldquo;Not now&rdquo; keeps the
              application without telling them anything.
            </p>
          </Panel>

          <Panel title="Worth knowing">
            <p className="hint mt-1">
              {promoters.length === 0
                ? "Nobody is promoting yet, so there is nothing to compare an application against."
                : `Of your ${promoters.length} promoter${
                    promoters.length === 1 ? "" : "s"
                  }, ${idle} ${idle === 1 ? "has" : "have"} never brought anyone. The ones who do have something in common: a group chat they already post in.`}
            </p>
            <p className="soft mt-2.5 border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13.5px] leading-[1.5]">
              &ldquo;Who will you share it with&rdquo; is the field worth reading.{" "}
              <strong>&ldquo;Everyone I know&rdquo;</strong> has never turned into an
              order. <strong>&ldquo;My block group, 240 people&rdquo;</strong> usually
              does.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
