import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import { oneCustomer } from "@/lib/customer";
import { getSettings, googleLinks } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { firstName, templateFor, whatsappTo } from "@/lib/messages";
import { naira, shareRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { namedPromoters } from "@/lib/promoters";
import { saveCustomerName, saveCustomerNote, setCustomerPromoter, setCustomerReviewed } from "../../actions";

export const dynamic = "force-dynamic";

/** A state read off the person, not a control. The same small tinted chip
 *  the customer book uses, which is not the tappable `chip`. */
function Tag({
  children,
  tone = "shell",
}: {
  children: React.ReactNode;
  tone?: "shell" | "mint" | "warn" | "volt";
}) {
  const skin =
    tone === "mint"
      ? "bg-mint/10 text-mint"
      : tone === "warn"
        ? "bg-brand-tint text-brand-dark"
        : tone === "volt"
          ? "bg-volt text-ink"
          : "bg-shell text-muted";
  return <span className={`tag ${skin}`}>{children}</span>;
}

/** The month somebody started, which is how long they have been around in
 *  the only unit anybody thinks in. */
function monthOf(when: string | null): string {
  if (!when) return "";
  const day = new Date(when);
  if (Number.isNaN(day.getTime())) return "";
  return day.toLocaleDateString("en-GB", { month: "long" });
}

function daysSince(when: string | null): number | null {
  if (!when) return null;
  const then = new Date(when).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

/**
 * One customer, on their own page.
 *
 * The book is a list of everybody and it is read to find somebody. This is
 * read once somebody has been found, and the question it answers is always
 * the same one: are they worth a message, and what should it say. So what
 * they spend, what they leave behind after food and fuel, what they order
 * and when, and every order they have ever placed on one screen.
 */
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone } = await params;
  const who = decodeURIComponent(phone);

  const [person, settings, url, promoters] = await Promise.all([
    oneCustomer(who),
    getSettings(),
    siteUrl(),
    namedPromoters(),
  ]);
  if (!person) notFound();

  const google = googleLinks(settings);
  const greeting = firstName(person.name, person.callsThem);
  const since = monthOf(person.since);
  const quiet = daysSince(person.orders[0]?.created_at ?? null);

  const sendPin = whatsappTo(
    person.phone,
    `Hi ${greeting}, here is your Sudu PIN: ${person.pin}.\n\n` +
      `Open ${url}/orders, put in your number and that PIN, and every ` +
      `order you have placed is there.`
  );
  const message = whatsappTo(person.phone, `Hi ${greeting}, `);
  const askReview =
    google.review !== "" && person.orders.length > 0
      ? whatsappTo(
          person.phone,
          templateFor({
            kind: "google",
            name: person.name,
            callsThem: person.callsThem,
            settings,
            pin: person.pin || null,
            siteUrl: url,
          })
        )
      : "";

  const promoter = promoters.find((one) => one.code === person.promoterCode) ?? null;
  const mostOrdered = person.favourites[0]?.count ?? 1;

  return (
    <div>
      <PageHeader
        backHref="/admin/customers"
        backLabel="All customers"
        title={person.name || formatPhone(person.phone)}
        detail={
          <>
            {formatPhone(person.phone)} · {person.hostel || "no block saved"} ·{" "}
            {person.pays === "card" ? "pays by card" : "pays by transfer"}
            {since !== "" && ` · customer since ${since}`}
          </>
        }
        actions={
          <>
            {person.pin !== "" && (
              <a href={sendPin} target="_blank" rel="noopener noreferrer" className="btn-quiet">
                Send their PIN
              </a>
            )}
            {askReview !== "" && !person.reviewed && (
              <a href={askReview} target="_blank" rel="noopener noreferrer" className="btn-quiet">
                Ask for a review
              </a>
            )}
            <a href={`tel:${person.phone}`} className="btn-quiet">
              Call
            </a>
            <a href={message} target="_blank" rel="noopener noreferrer" className="btn">
              Message {greeting || "them"}
            </a>
          </>
        }
      />

      <div className="mb-[18px] flex flex-wrap gap-2">
        {promoter && (
          <Tag tone="volt">
            <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-ink text-[8.5px] font-bold text-volt">
              {promoter.name.slice(0, 1).toUpperCase()}
            </span>
            {promoter.name}
          </Tag>
        )}
        {person.orders.length === 0 ? (
          <Tag>No orders yet</Tag>
        ) : quiet !== null && quiet > 30 ? (
          <Tag tone="warn">{quiet} days quiet</Tag>
        ) : person.orders.length > 1 ? (
          <Tag tone="mint">Regular</Tag>
        ) : (
          <Tag>Ordered once</Tag>
        )}
        {/* What they have given us in stars, which is not the same thing as
            the Google review tick: one is every order they rated, the other
            is somebody writing on a profile. Both are worth seeing. */}
        {person.rating !== null && (
          <Tag tone="volt">
            Rated us {"★".repeat(Math.round(person.rating))}
            {person.rating % 1 !== 0 && ` (${person.rating.toFixed(1)})`}
          </Tag>
        )}
        {person.reviewed && <Tag tone="volt">Reviewed on Google</Tag>}
        {person.pin !== "" && <Tag>PIN {person.pin}</Tag>}
        {person.errands && person.errands.count > 0 && (
          <Tag tone="mint">
            {naira(person.errands.took)} on {person.errands.count} errand
            {person.errands.count === 1 ? "" : "s"}
          </Tag>
        )}
      </div>

      <div className="mb-[18px] grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Lifetime spend"
          value={naira(person.spend)}
          detail={
            person.paidOrders === 0
              ? "Nothing paid for yet"
              : `${person.paidOrders} order${person.paidOrders === 1 ? "" : "s"}${
                  since === "" ? "" : ` since ${since}`
                }`
          }
        />
        <Figure
          label="Average order"
          value={naira(person.averageOrder)}
          detail={
            person.houseAverage === 0 || person.averageOrder === 0
              ? undefined
              : person.averageOrder >= person.houseAverage
                ? `Above the ${naira(person.houseAverage)} house average`
                : `Below the ${naira(person.houseAverage)} house average`
          }
        />
        {/* The one figure on this page that is worked out rather than
            recorded, so it says so. Run costs belong to a run, and the only
            honest way to put fuel against a person is to split it by what
            each order on that run paid. */}
        <Figure
          label={`Profit from ${greeting || "them"}`}
          value={naira(person.profit.profit)}
          tone={person.profit.profit >= 0 ? "mint" : "brand"}
          detail={
            person.profit.estimated
              ? "Estimate: after food, promoter and their share of the runs"
              : "After food, promoter and the runs they were on"
          }
        />
        <Figure
          label="Last ordered"
          value={quiet === null ? "Never" : quiet === 0 ? "Today" : `${quiet} day${quiet === 1 ? "" : "s"}`}
          detail={
            person.orders[0]
              ? `${runDateLabel(person.orders[0].runDate)} · ${
                  SLOT_LABEL[person.orders[0].slot] ?? ""
                }`
              : undefined
          }
        />
      </div>

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Every order"
          aside={
            <span className="text-[12.5px] text-muted">
              {person.orders.length} order{person.orders.length === 1 ? "" : "s"}
              {person.refunded > 0 && ` · ${person.refunded} refunded`}
            </span>
          }
        >
          {person.orders.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. They are in the book, so they can sign in and order whenever they like.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {person.orders.map((order) => {
                    const places = [
                      ...new Set(order.lines.map((line) => line.restaurant).filter(Boolean)),
                    ];
                    const items = order.lines.reduce((count, line) => count + line.qty, 0);
                    return (
                      <tr key={order.id} className="border-t-[1.5px] border-rule">
                        <td className="py-[11px] pr-2.5 font-mono text-[14.5px] text-muted">
                          {shareRef(order, order.groupOrders)}
                        </td>
                        <td className="py-[11px] pr-2.5">
                          <strong className="text-[14.5px]">
                            {places.join(", ") || "Nothing itemised"}
                            {items > 0 && ` · ${items} item${items === 1 ? "" : "s"}`}
                          </strong>
                          <p className="text-[12.5px] text-muted">
                            {runDateLabel(order.runDate)} · {SLOT_LABEL[order.slot] ?? ""} ·{" "}
                            {order.hostel || "no block"}
                          </p>
                        </td>
                        <td className="py-[11px] pr-2.5">
                          <Tag
                            tone={
                              order.status === "refunded"
                                ? "warn"
                                : order.status === "pending"
                                  ? "shell"
                                  : "mint"
                            }
                          >
                            {order.status}
                          </Tag>
                        </td>
                        <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px] font-semibold">
                          {naira(order.total)}
                        </td>
                        <td className="py-[11px] text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="chip border-black/10 bg-white py-1.5 text-[13px]"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          {promoter && (
            <Panel title={`Brought by ${promoter.name}`}>
              <div className="mb-3 mt-2 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-volt text-[17px] font-extrabold">
                  {promoter.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 grow">
                  <strong className="text-[15px]">{promoter.name}</strong>
                  <p className="text-[12.5px] text-muted">
                    Promoter · brought {person.broughtByThem}{" "}
                    {person.broughtByThem === 1 ? "person" : "people"}
                  </p>
                </div>
                <Link
                  href={`/admin/customers?by=${encodeURIComponent(promoter.code)}`}
                  className="chip shrink-0 border-black/10 bg-white py-1.5 text-[13px]"
                >
                  Open →
                </Link>
              </div>
              <p className="text-[12.5px] leading-[1.5] text-muted">
                Joined on {promoter.name}&rsquo;s link{since === "" ? "" : ` in ${since}`}. Worth{" "}
                {naira(person.spend)} so far, which is what a promoter&rsquo;s cut should be
                measured against.
              </p>
            </Panel>
          )}

          {person.favourites.length > 0 && (
            <Panel title={`What ${greeting || "they"} order${greeting ? "s" : ""}`}>
              <div className="mt-1">
                {person.favourites.slice(0, 6).map((place) => (
                  <div key={place.name} className="py-2">
                    <div className="flex justify-between text-[13.5px]">
                      <span>{place.name}</span>
                      <span className="font-mono">{place.count}×</span>
                    </div>
                    <div className="mt-1.5 h-[7px] rounded-full bg-rule">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round((place.count / mostOrdered) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Only said where it is actually true of them. A line saying
                  "always Queen Mary" about somebody who moves around every
                  week is worse than no line. */}
              {(person.usualHostel !== "" || person.usualSlot !== "") && (
                <p className="mt-2.5 text-[12.5px] leading-[1.5] text-muted">
                  {person.usualHostel !== "" && `Nearly always ${person.usualHostel}`}
                  {person.usualHostel !== "" && person.usualSlot !== "" && ", "}
                  {person.usualSlot !== "" &&
                    `${person.usualHostel === "" ? "Nearly always" : "always"} ${
                      SLOT_LABEL[person.usualSlot]
                    }`}
                  .{" "}
                  {person.usualSlot !== "" &&
                    `Tell ${greeting || "them"} first when a ${SLOT_LABEL[
                      person.usualSlot
                    ].toLowerCase()} run is thin.`}
                </p>
              )}
            </Panel>
          )}

          {/* The working behind the profit figure above it. A number nobody
              can take apart is a number nobody believes. */}
          <Panel title="Where the money went">
            <dl className="mt-1 text-[13.5px]">
              {[
                { label: "They paid", value: person.spend },
                { label: "Food at menu prices", value: -(person.spend - person.profit.margin) },
                { label: "Counters above the menu", value: -person.profit.overMenu },
                { label: "Promoter commission", value: -person.profit.commission },
                { label: "Their share of the runs", value: -person.profit.runShare },
              ].map((line) => (
                <div
                  key={line.label}
                  className="flex justify-between border-t-[1.5px] border-rule py-2"
                >
                  <dt>{line.label}</dt>
                  <dd className="font-mono">{naira(line.value)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 border-ink pt-2.5">
                <dt className="font-semibold">Left</dt>
                <dd
                  className={`font-display text-[32px] font-black leading-none ${
                    person.profit.profit >= 0 ? "text-mint" : "text-brand-dark"
                  }`}
                >
                  {naira(person.profit.profit)}
                </dd>
              </div>
            </dl>
            {person.profit.estimated && (
              <p className="mt-2 text-[12.5px] leading-[1.5] text-muted">
                Run costs belong to a run rather than to a person, so fuel and the driver are split
                between the orders on each run by what each one paid. Every other line is recorded.
              </p>
            )}
          </Panel>

          <Panel title="Note" detail="Only you see this.">
            <form action={saveCustomerNote} className="mt-1 space-y-2.5">
              <input type="hidden" name="phone" value={person.phone} />
              <textarea
                name="admin_note"
                rows={3}
                defaultValue={person.note}
                placeholder="Allergic to nothing, calls rather than messages"
                className="field min-h-[76px] py-2.5"
              />
              <SaveButton>Save note</SaveButton>
            </form>
          </Panel>

          <Panel
            title="Their name"
            detail={`Messages open with a first name. Now: ${firstName(person.name)}.`}
          >
            <form action={saveCustomerName} className="mt-1 flex gap-2">
              <input type="hidden" name="phone" value={person.phone} />
              <input
                name="calls_them"
                defaultValue={person.callsThem}
                placeholder="What to call them"
                className="field grow py-2 text-sm"
              />
              <SaveButton className="shrink-0 px-4 py-2 text-sm">Save</SaveButton>
            </form>
          </Panel>

          {promoters.length > 0 && (
            <Panel
              title="Who brought them"
              detail="Changing this moves every order they have ever placed."
            >
              <form action={setCustomerPromoter} className="mt-1 flex gap-2">
                <input type="hidden" name="phone" value={person.phone} />
                <select
                  name="promoter_code"
                  defaultValue={person.promoterCode ?? ""}
                  className="field grow py-2 text-sm"
                  aria-label="Who brought them"
                >
                  <option value="">Came in on their own</option>
                  {promoters.map((one) => (
                    <option key={one.code} value={one.code}>
                      Brought by {one.name}
                    </option>
                  ))}
                </select>
                <SaveButton className="shrink-0 px-4 py-2 text-sm">Save</SaveButton>
              </form>
            </Panel>
          )}

          {google.review !== "" && person.orders.length > 0 && (
            <form action={setCustomerReviewed}>
              <input type="hidden" name="phone" value={person.phone} />
              <input type="hidden" name="reviewed" value={String(!person.reviewed)} />
              <ActionButton
                className={`chip py-2 ${
                  person.reviewed ? "border-mint/40 bg-mint/10 text-mint" : "border-black/10 bg-white"
                }`}
                done="Done ✓"
              >
                {person.reviewed ? "Reviewed ✓" : "Mark reviewed on Google"}
              </ActionButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
