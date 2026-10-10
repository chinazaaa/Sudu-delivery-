import Link from "next/link";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { customerRows } from "@/lib/admin-data";
import { errandsBy } from "@/lib/other-money";
import { getSettings, googleLinks } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { firstName, templateFor, whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import SaveButton from "@/components/SaveButton";
import {
  addCustomer,
  deleteCustomer,
  saveCustomerName,
  saveCustomerNote,
  setCustomerPromoter,
  setCustomerReviewed,
} from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ActionButton from "@/components/admin/ActionButton";
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
 * tinted chip is its own thing here.
 */
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
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${skin}`}
    >
      {children}
    </span>
  );
}

/** Days since a date, or null where there is nothing to count from. */
function daysSince(when: string | null): number | null {
  if (!when) return null;
  const then = new Date(when).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

const VIEWS = [
  { value: "", label: "Everyone" },
  { value: "repeat", label: "Ordered twice or more" },
  { value: "quiet", label: "Quiet 30 days" },
  { value: "unreviewed", label: "Never reviewed" },
  { value: "big", label: "Big spenders" },
] as const;

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
  // can answer rather than something to be worked out by reading every card.
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
  // card does not read "0 orders" beside somebody who has paid us twenty
  // thousand naira.
  const aside = await errandsBy(shown.map((row) => row.phone));

  const spend = shown.reduce((total, row) => total + row.spend, 0);
  const repeat = shown.filter((row) => row.orders > 1).length;
  const brought = promoters.find((one) => one.code === by) ?? null;

  // The counts on the filter chips. Off the promoter's list rather than the
  // shown one, otherwise picking a chip sets every other chip to a count of
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

  return (
    <div>
      <header className="mb-[22px] flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="font-display text-[46px] font-black uppercase leading-[0.95]">
            Customers
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            {brought
              ? `Everybody ${brought.name} brought in, and what they have spent.`
              : by === "none"
                ? "Everybody who arrived on their own, with nobody to thank for it."
                : "Everyone who has ever ordered, with the PIN that opens their history."}
          </p>
        </div>
      </header>

      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Customers"
          value={String(shown.length)}
          detail={view === "" ? undefined : VIEWS.find((one) => one.value === view)?.label}
        />
        <Figure
          label="Ordered twice or more"
          value={String(repeat)}
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
      <div className="mb-3 flex flex-wrap gap-2">
        {VIEWS.map((one) => (
          <Link
            key={one.value || "all"}
            href={link({ view: one.value || undefined })}
            className={`chip px-3.5 text-sm ${
              view === one.value ? "border-ink bg-ink text-shell" : "border-ink bg-paper"
            }`}
          >
            {one.label}
            <span className="font-mono opacity-60">{counts[one.value] ?? 0}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/customers">
        {/* The cut survives a search. Searching inside "quiet 30 days" and
            landing back on everyone is the filter undoing itself. */}
        {view !== "" && <input type="hidden" name="view" value={view} />}
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name, number or block"
          className="field grow py-2 text-sm sm:max-w-xs"
        />
        {/* Only worth asking when somebody is promoting. One promoter and a
            dropdown of one is a control that does nothing. */}
        {promoters.length > 0 && (
          <select name="by" defaultValue={by} className="field py-2 text-sm sm:w-56">
            <option value="">Anyone brought them</option>
            {promoters.map((one) => (
              <option key={one.code} value={one.code}>
                Brought by {one.name}
              </option>
            ))}
            <option value="none">Nobody brought them</option>
          </select>
        )}
        <button className="btn-quiet px-4 py-2 text-sm">Search</button>
        {(by !== "" || (query.q ?? "") !== "" || view !== "") && (
          <a href="/admin/customers" className="btn-quiet px-4 py-2 text-sm">
            Clear
          </a>
        )}
      </form>

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <div>
          {shown.length === 0 ? (
            <p className="card text-sm text-muted">
              {rows.length === 0
                ? "No customers yet. A customer is created by their first order, or by hand on the right."
                : view !== ""
                  ? "Nobody in the book is in that state right now."
                  : brought
                    ? `Nobody is down as brought in by ${brought.name} yet.`
                    : by === "none"
                      ? "Everybody here was brought in by somebody."
                      : "Nobody here matches that."}
            </p>
          ) : (
            <div className="space-y-3">
              {shown.map((row) => {
                const message = whatsappTo(
                  row.phone,
                  `Hi ${firstName(row.name, row.callsThem)}, here is your Sudu PIN: ${row.pin}.\n\n` +
                    `Open ${url}/orders, put in your number and that PIN, and every ` +
                    `order you have placed is there.`
                );
                // The review ask, written out so it is one tap rather than
                // something to compose twenty times in an evening. Only for
                // somebody who has actually been delivered to: asking a person
                // who has never ordered to review us is how a profile gets
                // reported.
                //
                // The wording is the "Ask for a Google review" template, so it
                // is editable in Settings like every other message rather than
                // being the one sentence on the shop nobody can change.
                const askReview =
                  google.review !== "" && row.orders > 0
                    ? whatsappTo(
                        row.phone,
                        // templateFor, not template: this message is to a
                        // person, not about an order, and there is no order on
                        // this page to give it. Inventing one took the whole
                        // page down the moment the template reached for a field
                        // the invention did not have.
                        templateFor({
                          kind: "google",
                          name: row.name,
                          callsThem: row.callsThem,
                          settings,
                          pin: row.pin || null,
                          siteUrl: url,
                        })
                      )
                    : "";
                const since = daysSince(row.lastOrder);
                const errand = aside.get(row.phone);
                const promoter = promoters.find((one) => one.code === row.promoterCode) ?? null;
                return (
                  <article key={row.phone} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* The name is the way in to their own page, where
                            every order they have placed and what they are
                            worth after fuel is on one screen. */}
                        <h3 className="truncate text-[15px] font-bold">
                          <Link
                            href={`/admin/customers/${encodeURIComponent(row.phone)}`}
                            className="hover:underline"
                          >
                            {row.name || formatPhone(row.phone)}
                          </Link>
                        </h3>
                        <p className="text-[12.5px] text-muted">
                          {formatPhone(row.phone)} · {row.hostel || "No block saved"} ·{" "}
                          {row.pays === "card" ? "pays by card" : "pays by transfer"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {/* How they are, in the words the board uses. One
                              state, the loudest one, rather than a row of
                              tags saying the same thing three ways. */}
                          {row.orders === 0 ? (
                            <Tag>No orders yet</Tag>
                          ) : since !== null && since > 30 ? (
                            <Tag tone="warn">{since} days quiet</Tag>
                          ) : row.orders > 1 ? (
                            <Tag tone="mint">Regular</Tag>
                          ) : (
                            <Tag>Ordered once</Tag>
                          )}
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
                          {row.reviewed && <Tag tone="volt">Reviewed</Tag>}
                          {/* A Secret Santa room is a door into the shop, and
                              somebody who came through it has no orders behind
                              them. Naming the room turns a puzzling card into a
                              fact. */}
                          {santa.has(row.phone) && (
                            <Tag tone="mint">Secret Santa · {santa.get(row.phone)!.join(", ")}</Tag>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[15px] font-semibold">{naira(row.spend)}</p>
                        <p className="ticket text-muted">
                          {row.orders} order{row.orders === 1 ? "" : "s"} · PIN {row.pin || "none"}
                        </p>
                        {/* Errands they paid for with no order behind them. A
                            card reading "0 orders" beside somebody who has paid
                            us twenty thousand naira is not the truth. */}
                        {(errand?.count ?? 0) > 0 && (
                          <p className="text-xs font-semibold text-mint">
                            {naira(errand!.took)} on {errand!.count} errand
                            {errand!.count === 1 ? "" : "s"}
                          </p>
                        )}
                        {/* Which door they come through, over everything they
                            have ordered. Nothing is said for somebody whose
                            orders all predate the shop writing it down. */}
                        {row.uses !== "" && (
                          <p className="text-xs text-muted">
                            {row.uses === "app"
                              ? "Mostly the app"
                              : row.uses === "web"
                                ? "Mostly the website"
                                : "App and website"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href={message}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chip border-black/10 bg-white hover:border-ink/30"
                      >
                        Send their PIN
                      </a>
                      <a
                        href={`tel:${row.phone}`}
                        className="chip border-black/10 bg-white hover:border-ink/30"
                      >
                        Call
                      </a>
                      {/* Asking for a review, and remembering who has given
                          one. Google never says who wrote what, so the tick is
                          by hand and its only job is to stop the same person
                          being asked twice. */}
                      {askReview !== "" && !row.reviewed && (
                        <a
                          href={askReview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chip border-black/10 bg-white hover:border-ink/30"
                        >
                          Ask for a review
                        </a>
                      )}
                      {google.review !== "" && row.orders > 0 && (
                        <form action={setCustomerReviewed}>
                          <input type="hidden" name="phone" value={row.phone} />
                          <input type="hidden" name="reviewed" value={String(!row.reviewed)} />
                          <ActionButton
                            className={`chip py-1.5 ${
                              row.reviewed
                                ? "border-mint/40 bg-mint/10 text-mint"
                                : "border-black/10 bg-white"
                            }`}
                            done="Done ✓"
                          >
                            {row.reviewed ? "Reviewed ✓" : "Mark reviewed"}
                          </ActionButton>
                        </form>
                      )}
                      <a
                        href={`/admin/orders?status=all&q=${encodeURIComponent(row.phone)}`}
                        className="chip border-black/10 bg-white hover:border-ink/30"
                      >
                        Their orders
                      </a>
                      {/* Testing a checkout makes a customer, so a shop that has
                          been tested has a list mostly of itself. Anybody who has
                          ordered stays: their orders point at this number. */}
                      {row.orders === 0 && (
                        <form action={deleteCustomer}>
                          <input type="hidden" name="phone" value={row.phone} />
                          <ConfirmButton
                            tone="bare"
                            className="chip border-black/10 bg-white text-brand"
                            confirm={`Yes, delete ${row.name || row.phone}`}
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>

                    {/* Who brought them. The order path writes this once and
                        never again, which is what makes the commission lifetime,
                        so changing it here is the deliberate exception: it moves
                        every order they have ever placed. */}
                    {promoters.length > 0 && (
                      <form action={setCustomerPromoter} className="mt-3 flex gap-2">
                        <input type="hidden" name="phone" value={row.phone} />
                        <select
                          name="promoter_code"
                          defaultValue={row.promoterCode ?? ""}
                          className="field grow py-2 text-sm"
                          aria-label={`Who brought ${row.name || row.phone}`}
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
                    )}

                    {/* Messages open with a first name, and the first word of a
                        saved name is only a guess at which word that is: names
                        arrive written both ways round. This is where somebody
                        says which, once, for the ones the guess gets wrong. */}
                    <form action={saveCustomerName} className="mt-3 flex gap-2">
                      <input type="hidden" name="phone" value={row.phone} />
                      <input
                        name="calls_them"
                        defaultValue={row.callsThem}
                        placeholder={`What to call them (now: ${firstName(row.name)})`}
                        className="field grow py-2 text-sm"
                      />
                      <SaveButton />
                    </form>

                    <form action={saveCustomerNote} className="mt-3 flex gap-2">
                      <input type="hidden" name="phone" value={row.phone} />
                      <input
                        name="admin_note"
                        defaultValue={row.note}
                        placeholder="Note about this customer, only you see it"
                        className="field grow py-2 text-sm"
                      />
                      <SaveButton className="shrink-0 px-4 py-2 text-sm">Save</SaveButton>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel
            title="Who comes back"
            detail="Counted across the whole book, not the filter above it."
          >
            {[
              { label: "Ordered once, never again", count: once, bar: "bg-brand-dark" },
              { label: "Ordered 2 to 3 times", count: few, bar: "bg-volt" },
              { label: "4 or more", count: many, bar: "bg-mint" },
            ].map((band) => (
              <div key={band.label} className="py-2">
                <div className="flex justify-between text-[13.5px]">
                  <span>{band.label}</span>
                  <span className="font-mono">{band.count}</span>
                </div>
                <div className="mt-1.5 h-[7px] rounded-full bg-shell">
                  <div
                    className={`h-full rounded-full ${band.bar}`}
                    style={{ width: `${Math.round((band.count / widest) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {once > 0 && (
              <p className="mt-2 text-[12.5px] leading-[1.5] text-muted">
                {once} {once === 1 ? "person has" : "people have"} tried Sudu once. Winning half of
                them back is worth more than any new customer you can buy.
              </p>
            )}
          </Panel>

          {/* A customer with no order behind them. Needed whenever somebody must
              be able to sign in without food going into a car: an app reviewer who
              has to try the delete, or somebody who orders on WhatsApp and wants
              their history on the site. */}
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
                  {/* The blocks admin has set, the same list the checkout uses.
                      Typed by hand a block is misspelt every other time, and the
                      handout list cannot be sorted by it. */}
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
              <p className="text-xs text-muted">
                They can sign in straight away, with no orders behind them. Somebody who already
                exists is left exactly as they are, PIN and all.
              </p>
              <SaveButton>Add them</SaveButton>
            </form>
          </Panel>

          {!settings.whatsapp_number && (
            <p className="text-xs text-muted">
              Tip: set your own WhatsApp number in Settings so customers can reply to you on the
              same number.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
