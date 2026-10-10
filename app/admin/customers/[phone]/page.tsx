import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import { oneCustomer, type OneCustomer } from "@/lib/customer";
import { getSettings, googleLinks } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { firstName, templateFor, whatsappTo } from "@/lib/messages";
import { naira, shareRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { namedPromoters } from "@/lib/promoters";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  deleteCustomer,
  saveCustomerName,
  saveCustomerNote,
  setCustomerPromoter,
  setCustomerReviewed,
} from "../../actions";

export const dynamic = "force-dynamic";

/** A state read off the person, not a control. The same small tinted chip
 *  the customer book uses, which is not the tappable `chip`. */
function Tag({
  children,
  tone = "shell",
}: {
  children: React.ReactNode;
  /** The board's five chip grounds. A chip ground is a colour of its own
   *  rather than a solid at ten per cent, which is the solid over whatever
   *  the page happens to be sitting on. */
  tone?: "shell" | "mint" | "quiet" | "volt" | "bad";
}) {
  const skin =
    tone === "mint"
      ? "bg-mint-tint text-mint"
      : tone === "quiet"
        ? "bg-brand-tint text-amber-deep"
        : tone === "bad"
          ? "bg-brand-wash text-brand-dark"
          : tone === "volt"
            ? "bg-volt text-ink"
            : "bg-wash text-ink";
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

/**
 * A panel heading in the phone board's voice.
 *
 * On a desk these three are display headings beside the orders, which is
 * what every other panel is. On a phone the board drops them to the ticket
 * label it uses over a figure: a card holding one sentence or one box does
 * not need a heading the size of the page title above it, and three of them
 * down a phone screen read as three pages.
 *
 * One node rather than two panels behind display:none, because Panel takes
 * a node for its title.
 */
function Ticketed({ children, wide }: { children: string; wide?: string }) {
  return (
    <>
      <span className="ticket text-muted sm:hidden">{children}</span>
      <span className="hidden sm:inline">{wide ?? children}</span>
    </>
  );
}

/** "once", "twice", then plain counting. */
function timesWord(count: number): string {
  return count === 1 ? "once" : count === 2 ? "twice" : `${count} times`;
}

/** A list in the voice somebody would read it out in. */
function readOut(names: string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Where they order from, as one sentence.
 *
 * The bar chart is the desk's answer, where there is room beside the orders
 * for six bars and a scale. On a phone the board writes it out instead: six
 * bars on a card that narrow is six lines of chart saying what one line of
 * prose says, and prose is what somebody repeats to themselves before they
 * write the message.
 */
function whatTheyOrder(favourites: { name: string; count: number }[]): string {
  const again = favourites.filter((place) => place.count > 1);
  const once = favourites.filter((place) => place.count === 1).map((place) => place.name);
  const parts = again.map((place) => `${place.name} ${timesWord(place.count)}`);
  if (once.length > 0) {
    parts.push(
      `${parts.length > 0 ? "then " : ""}${readOut(once)} once${once.length > 1 ? " each" : ""}`
    );
  }
  return parts.join(", ");
}

/**
 * What an order was, in the board's words: the kitchen, then the food.
 *
 * It printed a count of items, which is the one thing about an order nobody
 * remembers it by. Named up to two lines, because that is what fits on a row
 * and because a shop of nine things is a shop, not a dish.
 */
function whatWasIn(lines: { name: string; qty: number }[]): string {
  if (lines.length === 0) return "";
  const items = lines.reduce((count, line) => count + line.qty, 0);
  if (lines.length > 2) return `${items} item${items === 1 ? "" : "s"}`;
  return lines
    .map((line) => `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ""}`)
    .join(", ");
}

/**
 * One order, as a row on a phone.
 *
 * Its own piece because the board folds this list after five: the five on
 * show and the rest behind the fold have to be the same row, and two copies
 * of a row is one copy that quietly stops matching.
 */
function PhoneRow({ order }: { order: OneCustomer["orders"][number] }) {
  const places = [...new Set(order.lines.map((line) => line.restaurant).filter(Boolean))];
  const food = whatWasIn(order.lines);
  return (
    <li className="border-t-[1.5px] border-rule">
      <Link
        href={`/admin/orders/${order.id}`}
        className="flex min-h-[56px] items-center gap-2.5 py-3"
      >
        <span className="min-w-0 grow">
          <span className="block text-sm font-semibold leading-[1.3]">
            {places.join(", ") || "Nothing itemised"}
            {food !== "" && ` · ${food}`}
          </span>
          <span className="hint block">
            {shareRef(order, order.groupOrders)} · {runDateLabel(order.runDate)} ·{" "}
            {SLOT_LABEL[order.slot] ?? ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-sm font-semibold">{naira(order.total)}</span>
          <Tag
            tone={
              order.status === "refunded" ? "bad" : order.status === "pending" ? "shell" : "mint"
            }
          >
            {order.status}
          </Tag>
        </span>
      </Link>
    </li>
  );
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

  /*
   * Where they usually are, and when, as a sentence.
   *
   * Only said where it is actually true of them: a line claiming "always
   * Queen Mary" about somebody who moves every week is worse than no line.
   * Built here because both widths read it, the phone inside the sentence
   * about what they order and the desk under the chart.
   */
  const usually =
    person.usualHostel === "" && person.usualSlot === ""
      ? ""
      : [
          person.usualHostel === "" ? "" : `Nearly always ${person.usualHostel}`,
          person.usualSlot === ""
            ? ""
            : `${person.usualHostel === "" ? "Nearly always" : "always"} a ${SLOT_LABEL[
                person.usualSlot
              ].toLowerCase()} run`,
        ]
          .filter((part) => part !== "")
          .join(", ");

  return (
    <div>
      <PageHeader
        backHref="/admin/customers"
        backLabel="All customers"
        title={person.name || formatPhone(person.phone)}
        /* Two lines for one sentence, because the phone has room for three
           facts and the desk has room for four. The board's phone line is the
           block, the month and the PIN: the number is on the two buttons just
           below it and the PIN is what they ring about, so the PIN takes the
           number's place and comes out of the tags. */
        detail={
          <>
            <span className="lg:hidden">
              {[
                person.hostel || "no block saved",
                since === "" ? "" : `since ${since}`,
                person.pin === "" ? "" : `PIN ${person.pin}`,
              ]
                .filter((part) => part !== "")
                .join(" · ")}
            </span>
            <span className="hidden lg:inline">
              {formatPhone(person.phone)} · {person.hostel || "no block saved"} ·{" "}
              {person.pays === "card" ? "pays by card" : "pays by transfer"}
              {since !== "" && ` · customer since ${since}`}
            </span>
          </>
        }
        /* On a desk every answer sits in the header, where the mouse
           already is. On a phone the header is the far end of a reach, so
           the board splits them: calling and messaging are a pair of
           full-width buttons under the tags, and the PIN and the review ask
           are in the bar at the bottom under the thumb. Same four buttons at
           both widths, each in the place the hand is. */
        actions={
          <>
            {person.pin !== "" && (
              <a
                href={sendPin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin hidden lg:inline-flex"
              >
                Send their PIN
              </a>
            )}
            {askReview !== "" && !person.reviewed && (
              <a
                href={askReview}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin hidden lg:inline-flex"
              >
                Ask for a review
              </a>
            )}
            <a href={`tel:${person.phone}`} className="btn-admin hidden lg:inline-flex">
              Call
            </a>
            <a
              href={message}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-admin-go hidden lg:inline-flex"
            >
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
          <Tag tone="quiet">{quiet} days quiet</Tag>
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
            {/* The stars alone on a phone, where the board shortens it: four
                words in front of five stars is most of the row for a thing
                the stars already say. */}
            <span className="hidden lg:inline">Rated us </span>
            {"★".repeat(Math.round(person.rating))}
            {person.rating % 1 !== 0 && ` (${person.rating.toFixed(1)})`}
          </Tag>
        )}
        {person.reviewed && <Tag tone="volt">Reviewed on Google</Tag>}
        {/* The PIN is in the sentence under the title on a phone, so the tag
            is the desk's alone rather than the same fact twice. */}
        {person.pin !== "" && (
          <span className="hidden lg:inline-flex">
            <Tag>PIN {person.pin}</Tag>
          </span>
        )}
        {person.errands && person.errands.count > 0 && (
          <Tag tone="mint">
            {naira(person.errands.took)} on {person.errands.count} errand
            {person.errands.count === 1 ? "" : "s"}
          </Tag>
        )}
      </div>

      {/* The two things this page is opened for in a hurry, where a thumb
          lands. Outlines both: the one red button on a phone is in the bar
          at the bottom. */}
      <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
        <a href={`tel:${person.phone}`} className="btn-admin min-h-[48px]">
          Call
        </a>
        <a
          href={message}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin min-h-[48px]"
        >
          WhatsApp
        </a>
      </div>

      {/* Four on a desk, two on a phone, which is what the board draws: what
          they have paid and what is left of it. The average against the house
          and the days since are desk figures, worth having beside the other
          two and not worth a second row on a screen where the next thing is
          every order they have placed. */}
      <div className="mb-[18px] grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
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
        <div className="hidden lg:block">
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
        </div>
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
        <div className="hidden lg:block">
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
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title={<Ticketed>Every order</Ticketed>}
          aside={
            <span className="flex items-center gap-2.5">
              {/* The count alone where there is no room for the word, which
                  is beside a title and a button on a phone. */}
              <span className="hint sm:hidden">
                {person.orders.length}
                {person.refunded > 0 && ` · ${person.refunded} refunded`}
              </span>
              <span className="hint hidden sm:block">
                {person.orders.length} order{person.orders.length === 1 ? "" : "s"}
                {person.refunded > 0 && ` · ${person.refunded} refunded`}
              </span>
              {/* The same orders in the orders book, where they can be worked
                  on rather than only read. */}
              <Link
                href={`/admin/orders?status=all&q=${encodeURIComponent(person.phone)}`}
                className="btn-admin btn-admin-sm"
              >
                In the orders book
              </Link>
            </span>
          }
        >
          {person.orders.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. They are in the book, so they can sign in and order whenever they like.
            </p>
          ) : (
            <div>
              {/* A row per order on a phone, each one a link into it. The
                  table is five columns of money and status, which on a three
                  hundred and ninety pixel screen is a table read sideways.

                  Five, then the rest behind "Show the other one", which is
                  what the board draws: somebody who has ordered twenty times
                  is the person this page is most worth opening for, and
                  twenty rows is the note and the name both off the screen. */}
              <ul className="mt-1 lg:hidden">
                {person.orders.slice(0, 5).map((order) => (
                  <PhoneRow key={order.id} order={order} />
                ))}
                {person.orders.length > 5 && (
                  <li>
                    <details className="group">
                      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-center border-t-[1.5px] border-rule text-sm font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">
                          Show the other {person.orders.length - 5 === 1 ? "one" : person.orders.length - 5}{" "}
                          ›
                        </span>
                        <span className="hidden group-open:inline">Hide those ‹</span>
                      </summary>
                      <ul>
                        {person.orders.slice(5).map((order) => (
                          <PhoneRow key={order.id} order={order} />
                        ))}
                      </ul>
                    </details>
                  </li>
                )}
              </ul>

              <div className="mt-2 hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse">
                  <tbody>
                    {person.orders.map((order) => {
                      const places = [
                        ...new Set(order.lines.map((line) => line.restaurant).filter(Boolean)),
                      ];
                      const food = whatWasIn(order.lines);
                      return (
                        <tr key={order.id} className="border-t-[1.5px] border-rule">
                          <td className="py-[11px] pr-2.5 font-mono text-[14.5px] text-muted">
                            {shareRef(order, order.groupOrders)}
                          </td>
                          <td className="py-[11px] pr-2.5">
                            <strong className="text-[14.5px]">
                              {places.join(", ") || "Nothing itemised"}
                              {food !== "" && ` · ${food}`}
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
                                  ? "bad"
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
                              className="btn-admin btn-admin-sm"
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
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          {promoter && (
            <Panel title={`Brought by ${promoter.name}`} size="sm">
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
                  className="btn-admin btn-admin-sm shrink-0"
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
            <Panel
              title={
                <Ticketed>{`What ${greeting || "they"} order${greeting ? "s" : ""}`}</Ticketed>
              }
              size="sm"
            >
              {/* The phone board writes this out as one sentence rather than
                  drawing the chart: six bars on a card that narrow is six
                  lines saying what one line says, and the sentence is what
                  somebody repeats to themselves while writing the message.
                  The chart is the desk's, from the first breakpoint up. */}
              <p className="mt-1 text-sm leading-[1.5] sm:hidden">
                {usually === "" ? "" : `${usually}. `}
                {whatTheyOrder(person.favourites)}.
              </p>
              <div className="mt-1 hidden sm:block">
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
              {/* Under the chart on a desk, where the sentence above is the
                  phone's whole answer. The thing to do about it is said here
                  and at both widths. */}
              {usually !== "" && (
                <p className="mt-2.5 text-[12.5px] leading-[1.5] text-muted">
                  <span className="hidden sm:inline">{usually}. </span>
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
          <Panel title="Where the money went" size="sm">
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

          <Panel
            title={<Ticketed wide="Note">Note · only you see it</Ticketed>}
            size="sm"
          >
            <form action={saveCustomerNote} className="mt-1 space-y-2.5">
              <input type="hidden" name="phone" value={person.phone} />
              <textarea
                name="admin_note"
                rows={3}
                defaultValue={person.note}
                placeholder="Only you see this"
                className="field min-h-[76px] py-2.5"
              />
              <SaveButton look="btn-admin btn-admin-sm">Save note</SaveButton>
            </form>
          </Panel>

          <Panel
            title="Their name"
            detail={`Messages open with a first name. Now: ${firstName(person.name)}.`}
            size="sm"
          >
            <form action={saveCustomerName} className="mt-1 flex gap-2">
              <input type="hidden" name="phone" value={person.phone} />
              <input
                name="calls_them"
                defaultValue={person.callsThem}
                placeholder="What to call them"
                className="field grow py-2 text-sm"
              />
              <SaveButton look="btn-admin btn-admin-sm" className="shrink-0">Save</SaveButton>
            </form>
          </Panel>

          {promoters.length > 0 && (
            <Panel
              title="Who brought them"
              detail="Changing this moves every order they have ever placed."
              size="sm"
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
                <SaveButton look="btn-admin btn-admin-sm" className="shrink-0">Save</SaveButton>
              </form>
            </Panel>
          )}

          {google.review !== "" && person.orders.length > 0 && (
            <form action={setCustomerReviewed}>
              <input type="hidden" name="phone" value={person.phone} />
              <input type="hidden" name="reviewed" value={String(!person.reviewed)} />
              <ActionButton
                className={`btn-admin btn-admin-sm ${
                  person.reviewed ? "border-mint bg-mint-tint text-mint" : ""
                }`}
                done="Done ✓"
              >
                {person.reviewed ? "Reviewed ✓" : "Mark reviewed on Google"}
              </ActionButton>
            </form>
          )}

          {/* Testing a checkout makes a customer, so a shop that has been
              tested has a book mostly of itself. Anybody who has ordered
              stays: their orders point at this number, and the action refuses
              them anyway. It lives here rather than in the book's table
              because a row of eight people is the wrong place to put the one
              button that cannot be undone. */}
          {person.orders.length === 0 && (
            <Panel
              title="Delete them"
              detail="Only while there is no order behind them."
              size="sm"
            >
              {/* The sixth rule: what is forever, written beside the button
                  rather than in a dialog after it. "Only while there is no
                  order behind them" says when you are allowed to, which is a
                  different sentence and was the only one here. */}
              <form action={deleteCustomer} className="mt-1 flex items-center gap-2.5">
                <input type="hidden" name="phone" value={person.phone} />
                <p className="hint flex-1">
                  Deleting is forever: their name, their block, their PIN and
                  their note go, and nothing else in the shop keeps them.
                  Leaving them costs nothing.
                </p>
                <ConfirmButton
                  tone="bad"
                  className="min-h-[44px] shrink-0"
                  confirm={`Yes, delete ${person.name || person.phone}`}
                >
                  Delete
                </ConfirmButton>
              </form>
            </Panel>
          )}
        </div>
      </div>

      {/* The bar the board puts at the bottom of this page: their PIN, which
          is what they ring about, and the review ask, which is the one thing
          worth doing to somebody who is already happy. Only drawn where
          there is something on it, because an empty bar is a bar that eats
          the end of the page for nothing. */}
      {(person.pin !== "" || (askReview !== "" && !person.reviewed)) && (
        <>
          <div className="phone-bar flex gap-2">
            {person.pin !== "" && (
              <a
                href={sendPin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin min-h-[50px] grow"
              >
                Send PIN
              </a>
            )}
            {askReview !== "" && !person.reviewed && (
              <a
                href={askReview}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin-go min-h-[50px] grow-[1.4]"
              >
                Ask for a review
              </a>
            )}
          </div>
          {/* A fixed bar is out of the flow, so the last panel would sit
              under it without this. */}
          <div aria-hidden className="h-[74px] lg:hidden" />
        </>
      )}
    </div>
  );
}
