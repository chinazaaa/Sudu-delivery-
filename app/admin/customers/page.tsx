import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { customerRows } from "@/lib/admin-data";
import { errandsBy } from "@/lib/other-money";
import { getSettings, googleLinks } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import {
  firstName,
  templateFor,
  whatsappTo,
  TEMPLATE_LABEL,
  type TemplateKind,
} from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import SaveButton from "@/components/SaveButton";
import { addCustomer } from "../actions";
import {
  Bar,
  Composer,
  Picking,
  Room,
  Tick,
  TickAll,
  VIEWS,
  broadcastHref,
  type Pattern,
  type Picked,
} from "@/components/admin/CustomerBulk";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { santaRooms } from "@/lib/santa-admin";

export const dynamic = "force-dynamic";

/**
 * A state read off a customer, not a control.
 *
 * The global `chip` is a tappable thing: forty-four pixels tall, two pixel
 * outline, because every chip on the shop side is something a thumb lands
 * on. A label saying "30 days quiet" is not pressable, and at that size a
 * row of them reads as five buttons nobody can press. So the board's small
 * tinted chip is the global `tag`, and this picks its colour.
 */
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

/** Days since a date, or null where there is nothing to count from. */
function daysSince(when: string | null): number | null {
  if (!when) return null;
  const then = new Date(when).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; by?: string; view?: string }>;
}) {
  const query = await searchParams;
  const [rows, settings, url, hostels, promoters, santa] = await Promise.all([
    customerRows(query.q),
    getSettings(),
    siteUrl(),
    hostelNames(),
    namedPromoters(),
    santaRooms(),
  ]);

  // Where to send somebody to leave a review. Empty and neither the ask nor
  // the tick is offered at all.
  const google = googleLinks(settings);

  // Narrowed to one promoter, so "who brought who" is a question the book
  // can answer rather than something to be worked out by reading every row.
  // "none" is a real answer and a useful one: it is everybody who arrived on
  // their own, which is the number a promoter's work has to be measured
  // against.
  const by = (query.by ?? "").trim();
  const forPromoter =
    by === ""
      ? rows
      : by === "none"
        ? rows.filter((row) => !row.promoterCode)
        : rows.filter((row) => row.promoterCode === by);

  // Spending above the house average is the only definition of a big spender
  // the book can defend: a fixed naira figure would be wrong in a month.
  // Measured across the promoter's own list, so the word means the same
  // thing whichever list is being read.
  const average =
    forPromoter.length === 0
      ? 0
      : forPromoter.reduce((total, row) => total + row.spend, 0) / forPromoter.length;

  const quiet = (row: (typeof rows)[number]) => {
    const since = daysSince(row.lastOrder);
    return since !== null && since > 30;
  };
  const unreviewed = (row: (typeof rows)[number]) => row.orders > 0 && !row.reviewed;

  const view = VIEWS.some((one) => one.value === query.view) ? (query.view as string) : "";
  const keep = (row: (typeof rows)[number]) =>
    view === "repeat"
      ? row.orders > 1
      : view === "quiet"
        ? quiet(row)
        : view === "unreviewed"
          ? unreviewed(row)
          : view === "big"
            ? row.spend > average
            : true;
  const shown = forPromoter.filter(keep);

  // What each of them has paid for an errand with no order behind it, so a
  // row does not read "0 orders" beside somebody who has paid us twenty
  // thousand naira.
  const aside = await errandsBy(shown.map((row) => row.phone));

  const spend = shown.reduce((total, row) => total + row.spend, 0);
  const repeat = shown.filter((row) => row.orders > 1).length;
  const brought = promoters.find((one) => one.code === by) ?? null;

  // The counts on the filter pills. Off the promoter's list rather than the
  // shown one, otherwise picking a pill sets every other pill to a count of
  // what is left after it.
  const counts: Record<string, number> = {
    "": forPromoter.length,
    repeat: forPromoter.filter((row) => row.orders > 1).length,
    quiet: forPromoter.filter(quiet).length,
    unreviewed: forPromoter.filter(unreviewed).length,
    big: forPromoter.filter((row) => row.spend > average).length,
  };

  // How many came back, which is the one number on this page worth acting on.
  // Counted across the promoter's list so it is not rewritten by a filter.
  const once = forPromoter.filter((row) => row.orders === 1).length;
  const few = forPromoter.filter((row) => row.orders >= 2 && row.orders <= 3).length;
  const many = forPromoter.filter((row) => row.orders >= 4).length;
  const widest = Math.max(once, few, many, 1);

  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: query.q, by: by || undefined, view: view || undefined, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const tail = params.toString();
    return tail === "" ? "/admin/customers" : `/admin/customers?${tail}`;
  };

  // Everybody shown, as little of them as a message needs. The greeting is
  // worked out here because the book's own answer for this person lives on
  // the server, and the composer only has to drop it in.
  const people: Picked[] = shown.map((row) => ({
    phone: row.phone,
    name: row.name || formatPhone(row.phone),
    greet: firstName(row.name, row.callsThem),
    block: row.hostel,
    pin: row.pin,
    spend: row.spend,
    orders: row.orders,
  }));

  /*
   * The templates the composer offers, which are the shop's own wording from
   * Settings rather than a second set of messages nobody knows exists.
   *
   * templateFor strips any token it cannot fill, so a token cannot be its
   * own placeholder on the way through: the name and the PIN go in as plain
   * words and come back out as tokens for the composer to fill per person.
   * Only the three messages that are about a person rather than an order are
   * offered, because the rest need an order and there is none on this page.
   */
  const pattern = (kind: TemplateKind): Pattern => ({
    kind,
    label: TEMPLATE_LABEL[kind],
    body: templateFor({
      kind,
      name: "SUDUNAME",
      settings,
      pin: "SUDUPIN",
      siteUrl: url,
    })
      .replaceAll("SUDUNAME", "{name}")
      .replaceAll("SUDUPIN", "{pin}"),
  });
  const patterns: Pattern[] = [
    pattern("pin"),
    pattern("review"),
    ...(google.review !== "" ? [pattern("google")] : []),
  ];

  const cut = VIEWS.find((one) => one.value === view) ?? null;
  const viewLabel = cut?.label ?? "";
  // What the cut says about the people in it, as a sentence rather than a
  // pill: "9 have not ordered in 30 days" is the reason to write to them.
  const nudge = cut?.nudge ?? "";

  return (
    <div>
      <PageHeader
        title="Customers"
        detail={
          brought
            ? `Everybody ${brought.name} brought in, and what they have spent.`
            : by === "none"
              ? "Everybody who arrived on their own, with nobody to thank for it."
              : "Everyone who has ever ordered, with the PIN that opens their history."
        }
        actions={
          <>
            <a href="#add-somebody" className="btn-admin">
              Add somebody
            </a>
            {/* The composer is a card beside the table on a desk and a screen
                of its own on a phone, so the button that opens it is a jump
                down the page at one width and a link at the other. Both go
                to the same composer; neither sends anything. */}
            <a href="#send-a-message" className="btn-admin hidden lg:inline-flex">
              Send a message
            </a>
            <a
              href={broadcastHref({
                phones: shown.map((row) => row.phone),
                view,
                by,
                q: query.q ?? "",
              })}
              className="btn-admin lg:hidden"
            >
              Send a message
            </a>
            {/* The book as it is filtered on the screen. The bar above the
                table exports the ticked rows instead, which is the other
                question people ask of a list. */}
            <a
              href={`/api/admin/export?what=customers${
                query.q ? `&q=${encodeURIComponent(query.q)}` : ""
              }${by ? `&by=${encodeURIComponent(by)}` : ""}`}
              className="btn-admin"
            >
              Export
            </a>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        <Figure
          label="Customers"
          value={String(shown.length)}
          detail={view === "" ? undefined : viewLabel}
        />
        <Figure
          label="Ordered twice or more"
          value={String(repeat)}
          tone="brand"
          detail={
            shown.length === 0
              ? undefined
              : `${Math.round((repeat / shown.length) * 100)}% come back, the number to move`
          }
        />
        <Figure label="Lifetime spend" value={naira(spend)} />
        <Figure
          label="Average each"
          value={naira(shown.length === 0 ? 0 : Math.round(spend / shown.length))}
          tone="mint"
        />
      </div>

      {/* The named cuts of the book, as links rather than a dropdown: the
          counts are the point, and a count inside a closed select is a count
          nobody reads. */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {VIEWS.map((one) => (
          <Link
            key={one.value || "all"}
            href={link({ view: one.value || undefined })}
            className={`pill-admin shrink-0 ${view === one.value ? "pill-admin-on" : ""}`}
          >
            {one.label}
            <span className="font-mono opacity-60">{counts[one.value] ?? 0}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2.5" action="/admin/customers">
        {/* The cut survives a search. Searching inside "quiet 30 days" and
            landing back on everyone is the filter undoing itself. */}
        {view !== "" && <input type="hidden" name="view" value={view} />}
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name, number or hostel block"
          className="field min-h-[44px] grow border-[1.5px] border-line bg-paper py-0 sm:min-w-[260px] sm:basis-0"
        />
        {/* Only worth asking when somebody is promoting. One promoter and a
            dropdown of one is a control that does nothing. */}
        {promoters.length > 0 && (
          <select
            name="by"
            defaultValue={by}
            className="field min-h-[44px] border-[1.5px] border-line bg-paper py-0 sm:w-[200px]"
          >
            <option value="">Anyone brought them</option>
            {promoters.map((one) => (
              <option key={one.code} value={one.code}>
                Brought by {one.name}
              </option>
            ))}
            <option value="none">Nobody brought them</option>
          </select>
        )}
        <button className="btn-admin">Search</button>
        {(by !== "" || (query.q ?? "") !== "" || view !== "") && (
          <a href="/admin/customers" className="btn-admin">
            Clear
          </a>
        )}
      </form>

      <Picking people={people} patterns={patterns}>
        <Bar
          viewLabel={viewLabel === "Everyone" ? "" : viewLabel}
          codeHref="/admin/coupons?new=1"
          view={view}
          by={by}
          q={query.q ?? ""}
        />

        {/* The one thing a cut of the book is for, said as a sentence with
            the answer under it. On a desk the same answer is the composer
            sitting beside the table, which is why this is the phone's: there
            the card would be a second way to reach a card already on screen. */}
        {view !== "" && shown.length > 0 && nudge !== "" && (
          <div className="card mb-3 border-volt-line bg-brand-tint p-3.5 lg:hidden">
            <strong className="text-[14.5px]">
              {shown.length} {nudge}
            </strong>
            <p className="hint">{naira(spend)} of lifetime spend between them.</p>
            <a
              href={broadcastHref({
                phones: shown.map((row) => row.phone),
                view,
                by,
                q: query.q ?? "",
              })}
              className="btn-admin-go mt-2.5 w-full"
            >
              Message all {shown.length}
            </a>
          </div>
        )}

        <div className="grid items-start gap-[18px] xl:grid-cols-[1.55fr_1fr]">
          {shown.length === 0 ? (
            <p className="card hint">
              {rows.length === 0
                ? "No customers yet. A customer is created by their first order, or by hand in Add somebody."
                : view !== ""
                  ? "Nobody in the book is in that state right now."
                  : brought
                    ? `Nobody is down as brought in by ${brought.name} yet.`
                    : by === "none"
                      ? "Everybody here was brought in by somebody."
                      : "Nobody here matches that."}
            </p>
          ) : (
            <div className="min-w-0">
              {/* A card for each person on a phone, because a table of seven
                  columns on a three hundred and ninety pixel screen is a
                  table read sideways. The card is a link to them with the
                  tick beside it, so picking nine people and opening one are
                  different taps rather than the same tap twice. */}
              <div className="mb-2.5 lg:hidden">
                <TickAll label="Pick everybody shown" />
              </div>
              <ul className="grid gap-2.5 lg:hidden">
                {shown.map((row) => {
                  const since = daysSince(row.lastOrder);
                  const promoter =
                    promoters.find((one) => one.code === row.promoterCode) ?? null;
                  const errand = aside.get(row.phone);
                  const rooms = santa.get(row.phone);
                  return (
                    <li key={row.phone} className="card flex items-start gap-1.5 p-3">
                      <Tick phone={row.phone} name={row.name || row.phone} tap />
                      <Link
                        href={`/admin/customers/${encodeURIComponent(row.phone)}`}
                        className="min-w-0 grow"
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <strong className="truncate text-[15px]">
                            {row.name || formatPhone(row.phone)}
                          </strong>
                          {/* Money is mono, even where the board sets this one
                              in the display face: a column of prices only
                              lines up in the one face that is monospaced. */}
                          <span className="shrink-0 font-mono text-[15px] font-semibold">
                            {naira(row.spend)}
                          </span>
                        </span>
                        <span className="hint block">
                          {row.hostel || "No block saved"} · {row.orders}{" "}
                          {row.orders === 1 ? "order" : "orders"}
                          {row.pin !== "" && ` · PIN ${row.pin}`}
                        </span>
                        {(errand?.count ?? 0) > 0 && (
                          <span className="block text-xs font-semibold text-mint">
                            {naira(errand!.took)} on {errand!.count} errand
                            {errand!.count === 1 ? "" : "s"}
                          </span>
                        )}
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {row.orders === 0 ? (
                            <Tag>No orders yet</Tag>
                          ) : since !== null && since > 30 ? (
                            <Tag tone="quiet">{since} days quiet</Tag>
                          ) : row.orders > 1 ? (
                            <Tag tone="mint">Regular</Tag>
                          ) : (
                            <Tag>Ordered once</Tag>
                          )}
                          {row.reviewed && <Tag tone="volt">Reviewed</Tag>}
                          {rooms && <Tag tone="mint">Secret Santa</Tag>}
                          {promoter ? (
                            <Tag tone="volt">
                              <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-ink text-[8.5px] font-bold text-volt">
                                {promoter.name.slice(0, 1).toUpperCase()}
                              </span>
                              {promoter.name}
                            </Tag>
                          ) : (
                            <Tag>found us</Tag>
                          )}
                          <span aria-hidden className="ml-auto text-[17px] text-muted">
                            ›
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="card hidden overflow-x-auto p-4 lg:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-7 pb-2 pr-2.5">
                        <TickAll />
                      </th>
                      {["Who", "How they are", "Brought by", "Spent", "Orders", "PIN", ""].map(
                        (head, at) => (
                          <th
                            key={head || `end-${at}`}
                            className="pb-2 pr-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                          >
                            {head}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => {
                      const since = daysSince(row.lastOrder);
                      const errand = aside.get(row.phone);
                      const promoter =
                        promoters.find((one) => one.code === row.promoterCode) ?? null;
                      const greeting = firstName(row.name, row.callsThem);
                      // The one message that is nobody's template: the owner
                      // opens the chat and says whatever this person needs.
                      const message = whatsappTo(row.phone, `Hi ${greeting}, `);
                      const rooms = santa.get(row.phone);
                      const door =
                        row.uses === "app"
                          ? "Mostly the app"
                          : row.uses === "web"
                            ? "Mostly the website"
                            : row.uses === ""
                              ? ""
                              : "App and website";
                      const second = [door, row.pays === "card" ? "Pays by card" : ""].filter(
                        (part) => part !== ""
                      );
                      return (
                        <tr key={row.phone} className="border-t-[1.5px] border-rule align-middle">
                          <td className="w-7 py-[11px] pr-2.5">
                            <Tick phone={row.phone} name={row.name || row.phone} />
                          </td>
                          <td className="py-[11px] pr-2.5 text-[14.5px]">
                            {/* The name is the way in to their own page, where
                                every order they have placed, what they are
                                worth after fuel, and every form about them
                                sits on one screen. */}
                            <Link
                              href={`/admin/customers/${encodeURIComponent(row.phone)}`}
                              className="text-[15px] font-bold hover:underline"
                            >
                              {row.name || formatPhone(row.phone)}
                            </Link>
                            <p className="hint">
                              {formatPhone(row.phone)} · {row.hostel || "No block saved"}
                            </p>
                            {/* Which door they come through, over everything
                                they have ordered. Nothing is said for somebody
                                whose orders all predate the shop writing it
                                down. */}
                            {second.length > 0 && <p className="hint">{second.join(" · ")}</p>}
                          </td>
                          <td className="py-[11px] pr-2.5 text-[14.5px]">
                            <div className="flex flex-wrap gap-1.5">
                              {/* How they are, in the words the board uses. One
                                  state, the loudest one, rather than a row of
                                  tags saying the same thing three ways. */}
                              {row.orders === 0 ? (
                                <Tag>No orders yet</Tag>
                              ) : since !== null && since > 30 ? (
                                <Tag tone="quiet">{since} days quiet</Tag>
                              ) : row.orders > 1 ? (
                                <Tag tone="mint">Regular</Tag>
                              ) : (
                                <Tag>Ordered once</Tag>
                              )}
                              {row.reviewed && <Tag tone="volt">Reviewed</Tag>}
                              {/* A Secret Santa room is a door into the shop,
                                  and somebody who came through it has no orders
                                  behind them. Naming the room turns a puzzling
                                  row into a fact. */}
                              {rooms && <Tag tone="mint">Secret Santa · {rooms.join(", ")}</Tag>}
                            </div>
                          </td>
                          <td className="py-[11px] pr-2.5 text-[14.5px]">
                            {promoter ? (
                              <Tag tone="volt">
                                <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-ink text-[8.5px] font-bold text-volt">
                                  {promoter.name.slice(0, 1).toUpperCase()}
                                </span>
                                {promoter.name}
                              </Tag>
                            ) : (
                              <Tag>found us</Tag>
                            )}
                          </td>
                          <td className="py-[11px] pr-2.5 font-mono text-[14.5px] font-semibold">
                            {naira(row.spend)}
                            {/* Errands they paid for with no order behind them.
                                A row reading "0 orders" beside somebody who has
                                paid us twenty thousand naira is not the
                                truth. */}
                            {(errand?.count ?? 0) > 0 && (
                              <span className="block font-sans text-xs font-semibold text-mint">
                                {naira(errand!.took)} on {errand!.count} errand
                                {errand!.count === 1 ? "" : "s"}
                              </span>
                            )}
                          </td>
                          <td className="py-[11px] pr-2.5 font-mono text-[14.5px]">{row.orders}</td>
                          <td className="py-[11px] pr-2.5 font-mono text-[14.5px] text-muted">
                            {row.pin || "none"}
                          </td>
                          <td className="whitespace-nowrap py-[11px] text-right">
                            <a
                              href={message}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-admin btn-admin-sm"
                            >
                              Message
                            </a>{" "}
                            {/* Their PIN, the review ask, the tick, the call,
                                their orders in the book, the note, who brought
                                them and what to call them are all one tap away
                                on their own page: a form does not fit in a
                                table row, and splitting them across two places
                                is how one of them gets forgotten. */}
                            <Link
                              href={`/admin/customers/${encodeURIComponent(row.phone)}`}
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

          <div className="flex flex-col gap-4">
            {/* Beside the table on a desk, where the list is what tells you
                whether the wording suits the people on it. On a phone it is
                /admin/broadcast, a screen of its own, because here it would
                be a card below everybody it is written to. */}
            <div className="hidden lg:block">
              <Composer hasOwnNumber={Boolean(settings.whatsapp_number)} />
            </div>

            <Panel
              title="Who comes back"
              detail="Counted across the whole book, not the filter above it."
            >
              {[
                { label: "Ordered once, never again", count: once, bar: "bg-brand-dark" },
                { label: "Ordered 2 to 3 times", count: few, bar: "bg-amber" },
                { label: "4 or more", count: many, bar: "bg-mint" },
              ].map((band) => (
                <div key={band.label} className="py-2">
                  <div className="flex justify-between text-[13.5px]">
                    <span>{band.label}</span>
                    <span className="font-mono">{band.count}</span>
                  </div>
                  <div className="mt-1.5 h-[7px] rounded-full bg-rule">
                    <div
                      className={`h-full rounded-full ${band.bar}`}
                      style={{ width: `${Math.round((band.count / widest) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {once > 0 && (
                <p className="hint mt-2 leading-[1.5]">
                  {once} {once === 1 ? "person has" : "people have"} tried Sudu once. Winning half
                  of them back is worth more than any new customer you can buy.
                </p>
              )}
            </Panel>

            {/* A customer with no order behind them. Needed whenever somebody
                must be able to sign in without food going into a car: an app
                reviewer who has to try the delete, or somebody who orders on
                WhatsApp and wants their history on the site. */}
            <div id="add-somebody">
              <Panel title="Add somebody" detail="By hand, with no order behind them.">
                <form action={addCustomer} className="mt-2 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="new_name">
                        Name
                      </label>
                      <input
                        id="new_name"
                        name="name"
                        required
                        className="field"
                        placeholder="App Review"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="new_phone">
                        Phone
                      </label>
                      <input
                        id="new_phone"
                        name="phone"
                        required
                        className="field"
                        placeholder="0803 000 0000"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="new_hostel">
                        Block (optional)
                      </label>
                      {/* The blocks admin has set, the same list the checkout
                          uses. Typed by hand a block is misspelt every other
                          time, and the handout list cannot be sorted by it. */}
                      {hostels.length > 0 ? (
                        <select id="new_hostel" name="hostel" defaultValue="" className="field">
                          <option value="">Not saying</option>
                          {hostels.map((hostel) => (
                            <option key={hostel} value={hostel}>
                              {hostel}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input id="new_hostel" name="hostel" className="field" />
                      )}
                    </div>
                    <div>
                      <label className="label" htmlFor="new_pin">
                        PIN (optional)
                      </label>
                      <input
                        id="new_pin"
                        name="pin"
                        inputMode="numeric"
                        maxLength={4}
                        className="field"
                        placeholder="Four digits, or leave it"
                      />
                    </div>
                  </div>
                  <p className="hint">
                    They can sign in straight away, with no orders behind them. Somebody who
                    already exists is left exactly as they are, PIN and all.
                  </p>
                  <SaveButton look="btn-admin-go">Add them</SaveButton>
                </form>
              </Panel>
            </div>
          </div>
        </div>

        <Room />
      </Picking>
    </div>
  );
}
