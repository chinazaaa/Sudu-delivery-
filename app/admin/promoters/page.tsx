import Link from "next/link";
import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import Diagnostic from "@/components/Diagnostic";
import CopyText from "@/components/CopyText";
import RenamePromoter from "@/components/admin/RenamePromoter";
import { promoterRows, type PromoterRow } from "@/lib/admin";
import { customerRows } from "@/lib/admin-data";
import { promoterEarnings } from "@/lib/promoters";
import { promoterSchema } from "@/lib/health";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import { formatPhone } from "@/lib/phone";
import { siteUrl } from "@/lib/admin-templates";
import { publicOffer } from "@/lib/coupons";
import { safeSettings } from "@/lib/settings";
import { recordPayout, savePromoter } from "../actions";

export const dynamic = "force-dynamic";

/** Every cell in the ranked list is the same shape, so the table is drawn once. */
const TH =
  "px-2.5 pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";
const TD = "border-t-[1.5px] border-rule px-2.5 py-2.5 align-middle text-[14.5px]";

/**
 * The cuts of the list, as the board names them.
 *
 * "Never used" is the one worth having: a code handed out that has never
 * brought anybody is a conversation that went nowhere, and five of them is
 * either a nudge or a clear-out.
 */
const VIEWS = [
  { value: "", label: "Everybody" },
  { value: "brought", label: "Brought somebody" },
  { value: "owed", label: "Owed" },
  { value: "paused", label: "Paused" },
  { value: "idle", label: "Never used" },
] as const;

/*
 * The same cuts, in the order the mobile board puts them: money first.
 *
 * A desk reads the list as a list and starts with everybody, which is what
 * that board draws. A phone is opened because somebody is owed, so Owed
 * leads and the rest follow it. One row of pills either way, ordered rather
 * than written out twice, so the desk keeps its reading order too.
 */
const PHONE_ORDER: Record<string, string> = {
  owed: "order-1",
  brought: "order-2",
  "": "order-3",
  idle: "order-4",
  paused: "order-5",
};

/**
 * The people getting customers onto the site: the ranked list, and one of
 * them on their own.
 *
 * Ranked by what the people they brought have actually spent, not by how
 * many they signed up, because that is the only number that says whether
 * promoting is working. Picking somebody out of the list swaps the page for
 * the board's single-promoter screen: their payouts, who they brought,
 * their rates and their code. It is one route on purpose. A promoter is
 * read in the context of the others, and `who` in the address means a page
 * about one person can still be come back to and reloaded.
 */
export default async function PromotersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; owed?: string; view?: string; q?: string }>;
}) {
  const asked = await searchParams;
  const who = (asked.who ?? "").trim().toUpperCase();
  const query = (asked.q ?? "").trim();
  // The dashboard arrives with money to hand over. It said `owed=1` long
  // before this page had named cuts, so it keeps working and means the same
  // thing as the Owed pill.
  const view = VIEWS.some((one) => one.value === asked.view)
    ? (asked.view as string)
    : asked.owed === "1"
      ? "owed"
      : "";

  const schema = await promoterSchema();
  const everybody = schema.ok ? await promoterRows() : [];

  // Who brought whom, which is what the list is ranked on. A customer
  // belongs to whoever brought them for life, so their whole lifetime spend
  // is what that promoter is worth to the shop.
  const customers = schema.ok ? await customerRows().catch(() => []) : [];
  const theirs = (code: string) => customers.filter((one) => one.promoterCode === code);
  const brought = new Map(
    everybody.map((one) => {
      const mine = theirs(one.code);
      return [
        one.code,
        { people: mine.length, worth: mine.reduce((total, row) => total + row.spend, 0) },
      ] as const;
    })
  );
  const worthOf = (code: string) => brought.get(code)?.worth ?? 0;
  const peopleOf = (code: string) => brought.get(code)?.people ?? 0;

  const ranked = [...everybody].sort((a, b) => worthOf(b.code) - worthOf(a.code));

  const counts: Record<string, number> = {
    "": everybody.length,
    brought: everybody.filter((one) => peopleOf(one.code) > 0).length,
    owed: everybody.filter((one) => one.owed > 0).length,
    paused: everybody.filter((one) => !one.active).length,
    idle: everybody.filter((one) => peopleOf(one.code) === 0).length,
  };

  const inView = ranked.filter((one) =>
    view === "brought"
      ? peopleOf(one.code) > 0
      : view === "owed"
        ? one.owed > 0
        : view === "paused"
          ? !one.active
          : view === "idle"
            ? peopleOf(one.code) === 0
            : true
  );
  const term = query.toLowerCase();
  const shown =
    term === ""
      ? inView
      : inView.filter(
          (one) =>
            one.name.toLowerCase().includes(term) || one.code.toLowerCase().includes(term)
        );

  // Whoever is being looked at on their own. An unknown code falls back to
  // the list rather than an empty page.
  const one = who === "" ? null : (everybody.find((row) => row.code === who) ?? null);

  const url = await siteUrl();
  // What their link is worth to whoever opens it, read off the code itself
  // so a brief sent today cannot promise ₦500 that was switched off in May.
  const perk = await publicOffer((await safeSettings()).promoter_perk_code);

  // About everybody, whoever is being looked at: the question "what do I owe
  // in total" does not change because the page is showing one person.
  const owed = everybody.reduce((total, row) => total + row.owed, 0);
  const paidOut = everybody.reduce((total, row) => total + row.paidOut, 0);
  const worth = everybody.reduce((total, row) => total + worthOf(row.code), 0);
  const peopleBrought = everybody.reduce((total, row) => total + peopleOf(row.code), 0);
  const ordered = customers.filter((row) => row.orders > 0).length;
  const idle = counts.idle;

  // Sent and not yet said to have landed. A transfer that never arrived
  // should not disappear quietly, so it stays on the page until the person
  // it was sent to says otherwise.
  const unconfirmed = everybody.flatMap((row) =>
    row.payouts.filter((payout) => !payout.confirmed_at).map((payout) => ({ row, payout }))
  );

  const link = (next: { view?: string; q?: string }) => {
    const params = new URLSearchParams();
    const merged = { view: view || undefined, q: query || undefined, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const tail = params.toString();
    return tail === "" ? "/admin/promoters" : `/admin/promoters?${tail}`;
  };

  if (one) {
    return (
      <OnePromoter
        promoter={one}
        people={theirs(one.code)}
        url={url}
        perkLine={perk ? perk.line : ""}
      />
    );
  }

  return (
    /* Room under the last card for the phone bar, which is fixed and would
       otherwise stand on top of whatever the page ends with. */
    <div className={owed > 0 ? "pb-[72px] lg:pb-0" : ""}>
      <PageHeader
        title="Promoters"
        /* The whole of it on a desk; on a phone the half that matters,
           because the line under a heading is the one thing that can be cut
           to get the list onto the screen. */
        detail={
          <>
            A customer belongs to whoever brought them, for life
            <span className="hidden lg:inline">
              , and every order they pay for counts at that promoter&apos;s rate
            </span>
            .
          </>
        }
        backHref="/admin/more"
        backLabel="More"
        actions={
          <>
            <a href="#add" className="btn-admin">
              Add a promoter
            </a>
            {/* The board's one red button on this screen. Nothing is paid
                from a list: it cuts the list down to whoever is owed, which
                is the round of transfers to make, each settled on their own
                screen where the account number is.

                On a phone it is on the bar at the bottom instead, where the
                thumb already is, so it is hidden here rather than drawn
                twice. */}
            {owed > 0 && (
              <Link href={link({ view: "owed" })} className="btn-admin-go hidden lg:inline-flex">
                Pay everyone owed · {naira(owed)}
              </Link>
            )}
          </>
        }
      />

      {!schema.ok && (
        <div className="mb-4">
          <Diagnostic
            title="This database is missing something"
            detail={`Saving a promoter will not work until ${schema.missing} exists. Run supabase/promoter_setup.sql in Supabase, then come back.`}
          />
        </div>
      )}

      {/* One card on a phone instead of four tiles, which is what this
          board draws: what the promoters have been worth, who they brought
          and what has gone out to them, with the rate it works out at
          folded in on a tint. It is "Is it worth it?" as well, so that
          panel is a desk thing. */}
      {everybody.length > 0 && (
        <div className="card mb-3 border-ink bg-ink p-3.5 text-shell lg:hidden">
          <p className="ticket text-shell/60">Worth so far</p>
          <p className="font-display text-[40px] font-black leading-none">{naira(worth)}</p>
          <p className="text-[13px] opacity-80">
            {peopleBrought} customer{peopleBrought === 1 ? "" : "s"} brought ·{" "}
            {naira(paidOut)} paid out
          </p>
          <p className="mt-2.5 border-t border-shell/20 pt-2.5 text-[13px] leading-[1.45]">
            {paidOut === 0 ? (
              <>
                Nothing has been paid out yet, so there is no rate to judge it on. The
                figure to watch is what the people they brought spend.
              </>
            ) : (
              <strong className="text-volt">
                ₦1 paid brings ₦{Math.round(worth / paidOut).toLocaleString("en-NG")} of
                orders.
              </strong>
            )}
          </p>
        </div>
      )}

      {everybody.length > 0 && (
        <div className="mb-3 hidden gap-2.5 sm:mb-4 sm:gap-3.5 lg:grid lg:grid-cols-2 xl:grid-cols-4">
          <Figure
            label="Promoting"
            value={String(everybody.length)}
            detail={
              idle === 0
                ? "Every one of them has brought somebody"
                : `${idle} ${idle === 1 ? "has" : "have"} never brought anyone`
            }
          />
          <Figure
            label="Customers brought"
            value={String(peopleBrought)}
            detail={
              ordered === 0
                ? "Nobody has ordered yet"
                : `${Math.round((peopleBrought / ordered) * 100)}% of everyone who has ordered`
            }
          />
          <Figure
            label="Worth so far"
            value={naira(worth)}
            tone="mint"
            detail="Lifetime spend of people they brought"
          />
          <Figure
            label="Owed right now"
            value={naira(owed)}
            tone={owed > 0 ? "brand" : "ink"}
            detail={
              owed === 0
                ? "Everybody is settled up"
                : `${counts.owed} ${counts.owed === 1 ? "promoter" : "promoters"}, waiting on a transfer`
            }
          />
        </div>
      )}

      {everybody.length > 1 && (
        <div className="mb-3 flex flex-col gap-1.5 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {/* Five cuts wrap onto three lines on a phone and push the list
              off the screen, so the board scrolls them sideways instead,
              edge to edge, where a half-shown pill says there is more. */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:flex-wrap sm:items-center sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
            {VIEWS.map((cut) => (
              <Link
                key={cut.value || "all"}
                href={link({ view: cut.value || undefined })}
                className={`pill-admin min-h-[34px] shrink-0 px-3 text-[13px] sm:min-h-[38px] sm:px-3.5 sm:text-sm lg:order-none ${
                  PHONE_ORDER[cut.value] ?? ""
                } ${view === cut.value ? "pill-admin-on" : ""}`}
              >
                {cut.label}
                <span className="font-mono opacity-60">{counts[cut.value] ?? 0}</span>
              </Link>
            ))}
          </div>
          {/* Narrowing by hand, which is how a list of twenty is used. The
              cut survives a search: searching inside "Owed" and landing back
              on everybody is the filter undoing itself.

              Its own line on a phone, under the cuts: a box this narrow
              beside a scrolling row of pills is a box nobody can type
              in. */}
          <form action="/admin/promoters" className="flex gap-2 sm:ml-auto">
            {view !== "" && <input type="hidden" name="view" value={view} />}
            <input
              name="q"
              defaultValue={query}
              placeholder="Name or code"
              className="field field-admin border-[1.5px] border-line sm:w-56"
            />
            <button className="btn-admin shrink-0">Search</button>
          </form>
        </div>
      )}

      <div className="grid items-start gap-3 sm:gap-[18px] xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-2.5 sm:space-y-3">
          {/* Where the dashboard's "Pay them" lands. It carries ?owed=1,
              which picks the Owed cut above, and this is the thing to be
              looking at when the page opens: a page of nine promoters with
              the two who are owed below the fold is a page that has to be
              scrolled before it can be read. */}
          <div id="owed" className="scroll-mt-4" />

          {/* A card for each of them below a desk, because eight columns of
              table on a three hundred and ninety pixel screen is not a
              table read sideways, it is a page whose width the table sets:
              the name off one edge, the owed figure off the other, and the
              forms underneath cut in half.

              The whole card is the link to their screen, which is where
              paying happens as well, so the red "Pay" on it is a label on
              that one link rather than a second link inside it. */}
          {shown.length > 0 && (
            <ul className="grid gap-2.5 lg:hidden">
              {shown.map((row) => (
                <li key={row.code}>
                  <Link
                    href={`/admin/promoters?who=${encodeURIComponent(row.code)}`}
                    className="card block p-3.5"
                  >
                    <span className="flex items-baseline justify-between gap-2.5">
                      <span className="min-w-0">
                        <strong className="block truncate text-[15.5px]">
                          {row.name || row.code}
                        </strong>
                        <span className="block font-mono text-[12px] text-muted">
                          {row.code}
                        </span>
                      </span>
                      {/* A dash rather than a zero where nothing is owed: a
                          column of zeroes reads as money and this one is
                          the absence of it. Money in mono, even where the
                          board sets a figure this size in the display face,
                          because a column of amounts only lines up in the
                          one face that is monospaced. */}
                      <span
                        className={`shrink-0 font-mono text-[17px] font-semibold ${
                          row.owed > 0 ? "text-brand-dark" : "text-muted"
                        }`}
                      >
                        {row.owed > 0 ? naira(row.owed) : "—"}
                      </span>
                    </span>
                    <span className="hint mb-1.5 mt-1 block">
                      {peopleOf(row.code)} brought · {naira(worthOf(row.code))} spent ·{" "}
                      {row.orders} order{row.orders === 1 ? "" : "s"} earned on
                    </span>
                    <span className="flex items-center gap-1.5">
                      {row.owed > 0 ? (
                        <span className="tag bg-brand-wash text-brand-dark">owed</span>
                      ) : (
                        <span className="tag bg-mint-tint text-mint">settled up</span>
                      )}
                      {!row.active && <span className="tag bg-wash text-ink">paused</span>}
                      {row.owed > 0 ? (
                        <span className="btn-admin btn-admin-sm ml-auto border-brand bg-brand text-white">
                          Pay {naira(row.owed)}
                        </span>
                      ) : (
                        <span aria-hidden className="ml-auto text-[17px] text-muted">
                          ›
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* The board closes the phone list on this, because a code handed
              out that has never brought anybody is the one thing on the
              screen somebody can act on that is not a transfer. The desk
              says it in the line under the table instead. */}
          {shown.length > 0 && idle > 0 && (
            <div className="soft border-volt-line bg-brand-tint p-3.5 lg:hidden">
              <strong className="text-[14px]">
                {idle} {idle === 1 ? "has" : "have"} never brought anyone
              </strong>
              <p className="hint mt-1">
                They have a code and a link and have not used them. Worth one message
                before you clear them out.
              </p>
              <Link
                href={link({ view: "idle" })}
                className="btn-admin btn-admin-sm mt-2.5 inline-flex"
              >
                See the {idle === 1 ? "one" : idle}
              </Link>
            </div>
          )}

          {shown.length > 0 && (
            <div className="card hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Promoter</th>
                      <th className={TH} />
                      <th className={TH}>Brought</th>
                      <th className={TH}>Worth</th>
                      <th className={TH}>Orders</th>
                      <th className={TH}>Earned</th>
                      <th className={`${TH} text-right`}>Owed</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr key={row.code}>
                        <td className={TD}>
                          <Link
                            href={`/admin/promoters?who=${encodeURIComponent(row.code)}`}
                            className="text-[15px] font-bold hover:underline"
                          >
                            {row.name || row.code}
                          </Link>
                          <span className="block font-mono text-[12.5px] text-muted">
                            {row.code} · PIN {row.pin || "not set"}
                          </span>
                        </td>
                        <td className={TD}>
                          {row.active ? (
                            <span className="tag bg-mint-tint text-mint">promoting</span>
                          ) : (
                            <span className="tag bg-wash text-ink">paused</span>
                          )}
                        </td>
                        <td className={`${TD} font-mono`}>{peopleOf(row.code)}</td>
                        <td className={`${TD} font-mono font-semibold`}>
                          {naira(worthOf(row.code))}
                        </td>
                        <td className={`${TD} font-mono`}>{row.orders}</td>
                        <td className={`${TD} font-mono text-muted`}>{naira(row.earned)}</td>
                        <td className={`${TD} text-right font-mono font-semibold`}>
                          {row.owed > 0 ? (
                            <span className="text-brand-dark">{naira(row.owed)}</span>
                          ) : (
                            <span className="text-mint">settled</span>
                          )}
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right`}>
                          {/* Red means money leaving, here and everywhere
                              else: it goes to their own screen, where the
                              account number and the run it settles are. */}
                          {row.owed > 0 && (
                            <Link
                              href={`/admin/promoters?who=${encodeURIComponent(row.code)}`}
                              className="btn-admin-go btn-admin-sm mr-1.5"
                            >
                              Pay {naira(row.owed)}
                            </Link>
                          )}
                          <Link
                            href={`/admin/promoters?who=${encodeURIComponent(row.code)}`}
                            className="btn-admin btn-admin-sm"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint mt-3 leading-[1.5]">
                Sorted by what the people they brought have actually spent, not by how
                many they signed up.
                {idle > 0 &&
                  ` ${idle} ${idle === 1 ? "promoter has" : "promoters have"} a code and have never brought anyone, which is worth a nudge or a clear-out.`}
              </p>
            </div>
          )}

          {shown.length === 0 && (
            <p className="card text-sm text-muted">
              {everybody.length === 0
                ? "Nobody is promoting yet. Whoever you add below appears at the checkout, under “Where did you hear about us?”, and every customer who names them is theirs for life."
                : "Nobody is in that part of the list right now."}
            </p>
          )}

          {/* Adding somebody is a thing you come to this page to do, and it
              was underneath however many promoters there already were, which
              is the wrong way round: the more of them there are, the further
              it moved. So it is one jump from the header. */}
          <Panel
            title="Add a promoter"
            detail="A code, a PIN and their own link. Everything else can be changed afterwards."
            className="scroll-mt-4"
          >
            <div id="add" />
            {/* Red when nothing else on the page is: with somebody owed
                money, handing that over is the thing to do next, and two
                red buttons mean neither reads as the answer. */}
            <PromoterForm primary={owed === 0} />
          </Panel>
        </div>

        {/* The right hand column is a desk column. On a phone what it says
            is already said: the rate is on the Ink card at the top, and a
            payout waiting to be confirmed is on the screen of the promoter
            it was sent to, with the same Chase beside it. */}
        <div className="hidden flex-col gap-3 sm:gap-4 lg:flex">
          <Panel
            title="Is it worth it?"
            detail="What you have paid out against what those customers have spent."
          >
            <div className="mb-3 mt-2 flex gap-3">
              <div className="flex-1">
                <p className="ticket text-muted">Paid out</p>
                <p className="font-display text-[30px] font-black leading-none">
                  {naira(paidOut)}
                </p>
              </div>
              <div className="flex-1">
                <p className="ticket text-muted">They spent</p>
                <p className="font-display text-[30px] font-black leading-none text-mint">
                  {naira(worth)}
                </p>
              </div>
            </div>
            <p className="soft border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13.5px] leading-[1.5]">
              {paidOut === 0 ? (
                <>
                  Nothing has been paid out yet, so there is no rate to judge it on. The
                  figure to watch is what the people they brought spend.
                </>
              ) : (
                <>
                  <strong>
                    ₦1 paid brings ₦{Math.round(worth / paidOut).toLocaleString("en-NG")} of
                    orders.
                  </strong>{" "}
                  At that rate a higher cut would still pay for itself, if it made more
                  people actually promote.
                </>
              )}
            </p>
          </Panel>

          <Panel
            title="Waiting to be confirmed"
            detail={
              <>
                Sent, but not yet confirmed by the promoter. Chase sends them a WhatsApp
                asking them to tap <strong>It landed</strong>.
              </>
            }
          >
            {unconfirmed.length === 0 ? (
              <p className="hint mt-1">
                Nothing is waiting. Every payout has been confirmed by the person it went
                to.
              </p>
            ) : (
              unconfirmed.slice(0, 6).map(({ row, payout }) => (
                <div
                  key={payout.id}
                  className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{row.name || row.code}</strong>
                    <span className="hint block">
                      {payout.note || "No note"} · sent{" "}
                      {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  <span className="font-mono font-semibold">{naira(payout.amount)}</span>
                  {/* Chasing is a message, not a state change: only they can
                      say the money landed. */}
                  <a
                    href={whatsappTo(
                      row.phone,
                      `Hi ${(row.name || row.code).split(" ")[0]}, we sent you ` +
                        `${naira(payout.amount)}. Open ${url}/promoter and confirm it ` +
                        `landed so we both have the same record.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-admin btn-admin-sm"
                  >
                    Chase
                  </a>
                </div>
              ))
            )}
            {unconfirmed.length > 0 && (
              /* Why a list of money already sent is worth keeping on the
                 screen at all, which is the thing somebody reaches for a
                 tick to make go away. */
              <p className="hint mt-2.5 leading-[1.5]">
                Only the promoter can confirm, on their own page. That is the point of
                it: a transfer that never landed stays visible here instead of being
                ticked off by mistake.
              </p>
            )}
          </Panel>
        </div>
      </div>

      {/* The one thing this screen is for, on the bar at the bottom of a
          phone. It pays nobody by itself: it cuts the list down to whoever
          is owed, and each of those is settled on their own screen where
          the account number is. */}
      {owed > 0 && (
        <div className="phone-bar">
          <Link
            href={link({ view: "owed" })}
            className="btn-admin-go min-h-[50px] w-full text-[15.5px]"
          >
            Pay everyone owed · {naira(owed)}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * One promoter, on the board's own screen for them.
 *
 * Everything about them that used to be folded away behind two summaries:
 * every payout against the run it settles, who they brought, where the money
 * goes, their rates and their code.
 */
async function OnePromoter({
  promoter,
  people,
  url,
  perkLine,
}: {
  promoter: PromoterRow;
  people: Awaited<ReturnType<typeof customerRows>>;
  url: string;
  perkLine: string;
}) {
  const earnings = await promoterEarnings(promoter.code);
  const runs = earnings?.runs ?? [];
  const toSettle = runs.filter((run) => run.earned > run.paidOut);
  const payouts =
    earnings?.payouts ??
    promoter.payouts.map((row) => ({ ...row, runLabel: "", batch_id: null }));
  const boxRate = (promoter as { box_rate?: number }).box_rate ?? 1000;

  // Their own front door. Anybody who opens it has their name filled in at
  // the checkout already, which is the whole point: promoters kept saying
  // people forget to pick it out of the dropdown.
  const theirLink = `${url}/s/${promoter.handle || promoter.code.toLowerCase()}`;

  // Everything they need in one message, because half of it is useless
  // alone: a PIN with no code, or a code with no page to put it into.
  const brief =
    `Hi ${promoter.name || "there"}, you are promoting Sudu.\n\n` +
    `You earn ${naira(promoter.rate)} on every order a customer you brought pays ` +
    `for, and ${naira(boxRate)} when it is a box or a collection, for as long as ` +
    `they keep ordering.\n\n` +
    `See what you have earned: ${url}/promoter\n` +
    `Code: ${promoter.code}\n` +
    `PIN: ${promoter.pin || "ask us"}\n\n` +
    `Your link: ${theirLink}\n` +
    (perkLine ? `Anybody who opens it gets ${perkLine}.\n` : "") +
    `Share that instead of sudu.store and anybody who orders after opening it ` +
    `is yours automatically, with your name already filled in at the checkout. ` +
    `They can still pick "${promoter.name || promoter.code}" by hand under ` +
    `"Where did you hear about us?" if they came another way.`;

  /*
   * The quieter ways of reaching them, written once and shown twice.
   *
   * The board's phone screen leads on two buttons, Call and Copy her link,
   * and this is everything else: the brief on WhatsApp, the brief on the
   * clipboard, and the orders the commission was worked out from. On a desk
   * they are in the header with the rest; on a phone they are folded away
   * under the figures, because five buttons above the money is the money
   * off the screen. One set of nodes either way, so there is nowhere for
   * the two to drift apart.
   */
  const reachThem = (
    <>
      <a
        href={
          promoter.phone
            ? whatsappTo(promoter.phone, brief)
            : `https://wa.me/?text=${encodeURIComponent(brief)}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="btn-admin w-full lg:w-auto"
      >
        {promoter.phone ? "Send their details" : "Share their details"}
      </a>
      {/* The same message, for a chat that is not WhatsApp. A code with no
          page to put it into is useless, so it is the whole brief that gets
          copied, not the link on its own. */}
      <CopyText
        value={brief}
        label="Copy their details"
        look="btn-admin"
        className="w-full lg:w-auto"
      />
      {/* Commission is worked out per order, so the orders behind the
          figures have to be reachable from them. */}
      <Link
        href={`/admin/orders?status=all&promoter=${encodeURIComponent(promoter.code)}`}
        className="btn-admin w-full lg:w-auto"
      >
        See their orders
      </Link>
    </>
  );

  const spent = people.reduce((total, row) => total + row.spend, 0);
  const theirOrders = people.reduce((total, row) => total + row.orders, 0);
  const sent = promoter.paidOut;
  const ranked = [...people].sort((a, b) => b.spend - a.spend);
  const first = promoter.name.split(" ")[0] || promoter.code;

  // How many orders each settled run counted, so a payout row can say what
  // it was for rather than only what it was worth.
  const ordersInRun = new Map(runs.map((run) => [run.batchId, run.orders]));

  /*
   * Chasing a payout that has not been confirmed, as a message.
   *
   * The list of everybody waiting is a desk panel, which on a phone is not
   * there at all, so the chase has to be on the screen of the person it is
   * about. It is still only ever a WhatsApp: admin cannot confirm a payout
   * landed, because only the promoter knows whether it did.
   */
  const chaseFor = (payout: { amount: number; confirmed_at: string | null }) =>
    payout.confirmed_at || !promoter.phone
      ? null
      : whatsappTo(
          promoter.phone,
          `Hi ${first}, we sent you ${naira(payout.amount)}. Open ${url}/promoter ` +
            `and confirm it landed so we both have the same record.`
        );

  /*
   * Where the money goes, written once and shown twice.
   *
   * On a desk it is in the right hand column, which is where that board
   * puts it. On a phone the board puts it directly under the figures,
   * because paying is what the screen is for and the account number is the
   * thing being read off it into a banking app, so it cannot be below
   * every payout and every customer they ever brought.
   */
  const sendItHere = (
    <Panel title="Send it here">
            {promoter.bank_account_number ? (
              <div className="soft mt-2 flex items-center gap-3 bg-shell px-3.5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-base font-semibold">
                    {promoter.bank_account_number}
                  </span>
                  <span className="hint block">
                    {promoter.bank_account_name || promoter.name}
                    {promoter.bank_name && ` · ${promoter.bank_name}`}
                  </span>
                </span>
                {/* Ten digits read off one screen and typed into a banking
                    app is where a payout goes to the wrong person. One tap
                    instead. */}
                <CopyText
                  value={promoter.bank_account_number}
                  label="Copy"
                  look="btn-admin btn-admin-sm"
                  className="shrink-0"
                />
              </div>
            ) : (
              <p className="hint mt-2">
                They have not filled their account details in yet. They do that
                themselves, on their own page.
              </p>
            )}
            {/* The whole arrangement in one sentence, in the board's words:
                paying is the only thing admin can do to a payout, and
                confirming is the promoter's. */}
            <p className="hint mt-2.5 leading-[1.5]">
              Paying marks it sent. It stays &ldquo;not confirmed&rdquo; until {first}{" "}
              confirms it on their own page, so a transfer that never lands does not
              disappear.
            </p>
    </Panel>
  );


  return (
    /* Room under the last panel for the phone bar. */
    <div className={promoter.owed > 0 ? "pb-[76px] lg:pb-0" : ""}>
      <PageHeader
        backHref="/admin/promoters"
        backLabel="All promoters"
        title={promoter.name || promoter.code}
        detail={
          <>
            {promoter.code} · PIN {promoter.pin || "not set"} · {naira(promoter.rate)} an
            order, {naira(boxRate)} a box · {theirLink.replace(/^https?:\/\//, "")}
            {!promoter.active && " · paused"}
          </>
        }
        actions={
          <>
            {/* The board's two: the ones used while standing next to
                somebody, side by side across the screen on a phone. */}
            {promoter.phone && (
              <a
                href={`tel:${promoter.phone}`}
                className="btn-admin order-1 flex-1 lg:order-none lg:flex-none"
              >
                Call
              </a>
            )}
            <CopyText
              value={theirLink}
              label="Copy their link"
              look="btn-admin"
              className="order-2 flex-[1.4] lg:order-none lg:flex-none"
            />
            <div className="order-4 hidden flex-wrap items-center gap-2 lg:flex">
              {reachThem}
            </div>
            {/* The board gives this screen one red button, and it is the
                money. It cannot pay anybody by itself, because paying is a
                transfer in a banking app and each run is settled on its own
                row, so it goes to the rows that do it. On a phone it stands
                on the bar at the bottom instead. */}
            {promoter.owed > 0 && (
              <a href="#payout" className="btn-admin-go order-5 hidden lg:inline-flex">
                Pay {naira(promoter.owed)}
              </a>
            )}
          </>
        }
      />

      {!promoter.phone && (
        <p className="hint mb-3">
          No number saved, so WhatsApp will ask which chat. Their number goes in under
          their details below.
        </p>
      )}

      {/* Two tiles on a phone, not four, which is what this board draws:
          the four facts become two, each carrying its second fact in the
          line underneath. What they brought, and what is owed of what they
          earned. */}
      <div className="mb-3 grid grid-cols-2 gap-2.5 lg:hidden">
        <Figure
          label="Brought"
          value={String(people.length)}
          detail={`${naira(spent)} spent`}
        />
        <Figure
          label="Owed"
          value={promoter.owed > 0 ? naira(promoter.owed) : "Settled"}
          tone={promoter.owed > 0 ? "brand" : "mint"}
          detail={
            promoter.owed > 0
              ? `of ${naira(promoter.earned)} earned`
              : `${naira(sent)} handed over`
          }
        />
      </div>

      {/* Everything else there is to do with them, one tap away rather than
          five buttons between the heading and the money. */}
      <details className="mb-3 lg:hidden">
        <summary className="btn-admin w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          Other ways to reach {first}
        </summary>
        <div className="mt-2 grid gap-2">{reachThem}</div>
      </details>

      <div className="mb-[18px] hidden gap-3.5 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Brought"
          value={String(people.length)}
          detail={people.length === 1 ? "person, for life" : "people, for life"}
        />
        <Figure
          label="They have spent"
          value={naira(spent)}
          tone="mint"
          detail={`Across ${theirOrders} order${theirOrders === 1 ? "" : "s"}`}
        />
        <Figure
          label="Earned"
          value={naira(promoter.earned)}
          detail={`${promoter.orders} order${promoter.orders === 1 ? "" : "s"} at their rate`}
        />
        <Figure
          label="Owed"
          value={promoter.owed > 0 ? naira(promoter.owed) : "Settled"}
          tone={promoter.owed > 0 ? "brand" : "mint"}
          detail={
            promoter.owed > 0
              ? toSettle.map((run) => run.label).join(" · ") || "Across their runs"
              : `${naira(sent)} handed over so far`
          }
        />
      </div>

      <div className="grid items-start gap-3 sm:gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* First thing on a phone, under the figures, because the account
              number is what the screen is for. The desk keeps it in the
              right hand column, where its board has it. */}
          <div className="lg:hidden">{sendItHere}</div>

          <Panel
            title="Every payout"
            className="scroll-mt-4"
            aside={
              <span className="hint">
                {naira(promoter.earned)} earned · {naira(sent)} sent ·{" "}
                {naira(promoter.owed)} owed
              </span>
            }
          >
            <div id="payout" />

            {/* The same payouts as rows below a desk, which is what the
                board draws: four table columns on a phone put the amount
                and the Pay button off the side of the screen, and the table
                sets the width of everything under it.

                What is owed leads, because it is the decision. Then the
                four most recent, with the rest behind the board's own
                "All 8" so a promoter paid every week is not twenty rows
                between the account number and their rates. */}
            <div className="mt-1 lg:hidden">
              {toSettle.map((run) => (
                <div key={run.batchId} className="border-t-[1.5px] border-rule py-2.5">
                  <div className="flex items-baseline gap-2.5">
                    <strong className="min-w-0 flex-1 truncate text-[14px]">
                      {run.label}
                    </strong>
                    <span className="shrink-0 font-mono text-[14px] font-semibold">
                      {naira(run.earned - run.paidOut)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="hint min-w-0 flex-1">
                      {run.orders} order{run.orders === 1 ? "" : "s"}
                      {run.paidOut > 0 && ` · ${naira(run.paidOut)} already paid`}
                    </span>
                    <span className="tag bg-brand-wash text-brand-dark">owed</span>
                    <form action={recordPayout} className="shrink-0">
                      <input type="hidden" name="code" value={promoter.code} />
                      <input type="hidden" name="batch_id" value={run.batchId} />
                      <input type="hidden" name="amount" value={run.earned - run.paidOut} />
                      <input type="hidden" name="note" value={run.label} />
                      <SaveButton look="btn-admin-go btn-admin-sm">Pay</SaveButton>
                    </form>
                  </div>
                </div>
              ))}

              {payouts.slice(0, 4).map((payout) => (
                <PayoutRow
                  key={payout.id}
                  payout={payout}
                  orders={ordersInRun.get(payout.batch_id ?? "") ?? null}
                  chase={chaseFor(payout)}
                />
              ))}

              {payouts.length > 4 && (
                /* The rest, rather than a link to a page that does not
                   exist: nothing is dropped, it is folded. */
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-1 border-t-[1.5px] border-rule py-2.5 text-sm font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                    All {payouts.length} ›
                  </summary>
                  {payouts.slice(4).map((payout) => (
                    <PayoutRow
                      key={payout.id}
                      payout={payout}
                      orders={ordersInRun.get(payout.batch_id ?? "") ?? null}
                      chase={chaseFor(payout)}
                    />
                  ))}
                </details>
              )}
            </div>

            <table className="mt-2 hidden w-full border-collapse lg:table">
              <tbody>
                {/* What is owed first, because it is the decision. One row
                    per run, and paying settles that run in particular, which
                    is what keeps this page and their own page agreeing. */}
                {toSettle.map((run) => (
                  <tr key={run.batchId}>
                    <td className={TD}>
                      <strong className="text-[14.5px]">{run.label}</strong>
                      <span className="hint block">
                        {run.orders} order{run.orders === 1 ? "" : "s"}
                        {run.paidOut > 0 && ` · ${naira(run.paidOut)} already paid`}
                      </span>
                    </td>
                    <td className={TD}>
                      <span className="tag bg-brand-wash text-brand-dark">owed</span>
                    </td>
                    <td className={`${TD} text-right font-mono font-semibold`}>
                      {naira(run.earned - run.paidOut)}
                    </td>
                    <td className={`${TD} text-right`}>
                      <form action={recordPayout}>
                        <input type="hidden" name="code" value={promoter.code} />
                        <input type="hidden" name="batch_id" value={run.batchId} />
                        <input
                          type="hidden"
                          name="amount"
                          value={run.earned - run.paidOut}
                        />
                        <input type="hidden" name="note" value={run.label} />
                        {/* The one red thing on this screen: money leaving. */}
                        <SaveButton look="btn-admin-go btn-admin-sm">Pay</SaveButton>
                      </form>
                    </td>
                  </tr>
                ))}
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className={TD}>
                      <strong className="text-[14.5px]">
                        {payout.runLabel ||
                          payout.note ||
                          new Date(payout.paid_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                          })}
                      </strong>
                      <span className="hint block">
                        sent{" "}
                        {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })}
                        {payout.runLabel && payout.note && ` · ${payout.note}`}
                      </span>
                    </td>
                    <td className={TD}>
                      {payout.confirmed_at ? (
                        <span className="tag bg-mint-tint text-mint">confirmed</span>
                      ) : (
                        <span className="tag bg-brand-tint text-amber-deep">
                          sent · not confirmed
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-right font-mono font-semibold`}>
                      {naira(payout.amount)}
                    </td>
                    <td className={`${TD} text-right`}>
                      {/* Words, not a button, because there is nothing for
                          anybody here to press: only the promoter can say
                          the money landed, on their own page. Chasing them
                          for it is on the list, where everybody waiting is
                          in one place. */}
                      {!payout.confirmed_at && <span className="hint">they confirm</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {toSettle.length === 0 && payouts.length === 0 && (
              <p className="hint mt-2">
                Nothing earned yet. A payout appears here the moment a customer they
                brought pays for an order.
              </p>
            )}

            <div className="soft mt-3 bg-shell p-3.5">
              <p className="ticket mb-2 text-muted">Anything that does not fit a run</p>
              <form action={recordPayout} className="flex flex-wrap items-end gap-2.5">
                <input type="hidden" name="code" value={promoter.code} />
                <div className="w-full sm:w-32">
                  <label className="label" htmlFor={`amount-${promoter.code}`}>
                    Paid them
                  </label>
                  <input
                    id={`amount-${promoter.code}`}
                    name="amount"
                    inputMode="numeric"
                    placeholder={String(promoter.owed || 0)}
                    className="field py-2 text-sm"
                  />
                </div>
                <div className="w-full sm:grow">
                  <label className="label" htmlFor={`note-${promoter.code}`}>
                    Note
                  </label>
                  <input
                    id={`note-${promoter.code}`}
                    name="note"
                    placeholder="Transfer, 26 Sept"
                    className="field py-2 text-sm"
                  />
                </div>
                <SaveButton look="btn-admin" className="shrink-0">
                  Record it
                </SaveButton>
              </form>
              <p className="hint mt-2">
                Recording it takes it off what they are owed, here and on their own page.
                The buttons above do the same thing for one run; this is for anything
                that does not fit one.
              </p>
            </div>
          </Panel>

          <Panel
            title={`Who ${first} brought`}
            aside={
              <span className="hint">
                {people.length} {people.length === 1 ? "person" : "people"} ·{" "}
                {naira(spent)}
              </span>
            }
          >
            {ranked.length === 0 ? (
              <p className="hint mt-1">
                Nobody yet. A customer is theirs the first time they order through their
                link, or name them at the checkout, and stays theirs for life.
              </p>
            ) : (
              <>
                {ranked.slice(0, 4).map((row) => (
                  <div
                    key={row.phone}
                    className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[14.5px]">
                        {row.name || formatPhone(row.phone)}
                      </strong>
                      <span className="hint block">
                        {row.hostel || "No block saved"} · {row.orders} order
                        {row.orders === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-mono font-semibold">{naira(row.spend)}</span>
                    <Link
                      href={`/admin/customers/${encodeURIComponent(row.phone)}`}
                      className="btn-admin btn-admin-sm"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
                {ranked.length > 4 && (
                  <Link
                    href={`/admin/customers?by=${encodeURIComponent(promoter.code)}`}
                    className="block border-t-[1.5px] border-rule pb-0.5 pt-2.5 text-center text-sm font-semibold text-brand-dark"
                  >
                    The other {ranked.length - 4} ›
                  </Link>
                )}
              </>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="hidden lg:block">{sendItHere}</div>

          <Panel
            title="Their rates"
            detail="Changing these affects orders from now on, never ones already counted."
          >
            <form action={savePromoter} className="mt-2">
              {/* The whole row is written at once, so a form that shows two
                  fields has to carry the rest or saving a rate would blank
                  their name. Their details are the form underneath. */}
              <input type="hidden" name="code" value={promoter.code} />
              <input type="hidden" name="name" value={promoter.name} />
              <input type="hidden" name="phone" value={promoter.phone} />
              <input type="hidden" name="handle" value={promoter.handle ?? ""} />
              <input type="hidden" name="pin" value={promoter.pin ?? ""} />
              <div className="mb-2.5 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label" htmlFor={`rate-${promoter.code}`}>
                    Per order
                  </label>
                  <input
                    id={`rate-${promoter.code}`}
                    name="rate"
                    inputMode="numeric"
                    defaultValue={promoter.rate}
                    className="field py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`box-${promoter.code}`}>
                    Per box or collection
                  </label>
                  <input
                    id={`box-${promoter.code}`}
                    name="box_rate"
                    inputMode="numeric"
                    defaultValue={boxRate}
                    className="field py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex min-h-[44px] items-center gap-2.5 border-t-[1.5px] border-rule text-sm font-semibold">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={promoter.active}
                  className="size-[18px] accent-brand"
                />
                Paying {first} at the moment
              </label>
              <SaveButton look="btn-admin" className="mt-1.5 w-full">
                Save rates
              </SaveButton>
            </form>
            <p className="hint mt-2">
              A box is a packed sale: a care package, a hostel pack, a gift, a food box.
              Ordinary food, skincare, parcels and ordering together all pay the rate on
              the left.
            </p>
          </Panel>

          <Panel title="Their code">
            {/* Its own form, because it is the one thing here that can break
                somebody's earnings: every customer they have ever brought
                points at that code. */}
            <RenamePromoter code={promoter.code} />
          </Panel>

          <Panel
            title="Their details"
            detail="Their name at the checkout, their number, their link and their PIN."
          >
            <PromoterForm promoter={{ ...promoter, box_rate: boxRate }} />
          </Panel>
        </div>
      </div>

      {/* The board's bar: the money, and the run it settles, so the thumb
          lands on the right one without scrolling back up. It jumps to the
          payout rows rather than paying, because paying is a transfer in a
          banking app and each run is settled on its own row. */}
      {promoter.owed > 0 && (
        <div className="phone-bar">
          <a href="#payout" className="btn-admin-go min-h-[52px] w-full text-base">
            Pay {naira(promoter.owed)}
            {toSettle.length > 0 && ` · ${toSettle[0].label}`}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * One payout, as a row on a phone.
 *
 * The run it settled, how many orders that was and when it went out, the
 * amount, and the state as a tag. The state is never a button: only the
 * promoter can say the money landed, on their own page, so the most this
 * can do about one that has not been confirmed is ask them again.
 */
function PayoutRow({
  payout,
  orders,
  chase,
}: {
  payout: {
    amount: number;
    note: string;
    paid_at: string;
    runLabel: string;
    confirmed_at: string | null;
  };
  /** How many orders the run it settled counted, where it settled one. */
  orders: number | null;
  /** The WhatsApp that asks them to confirm, or nothing when it is already
   *  confirmed or there is no number to send it to. */
  chase: string | null;
}) {
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

  return (
    <div className="border-t-[1.5px] border-rule py-2.5">
      <div className="flex items-baseline gap-2.5">
        <strong className="min-w-0 flex-1 truncate text-[14px]">
          {payout.runLabel || payout.note || day(payout.paid_at)}
        </strong>
        <span className="shrink-0 font-mono text-[14px] font-semibold">
          {naira(payout.amount)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="hint min-w-0 flex-1">
          {orders !== null && `${orders} order${orders === 1 ? "" : "s"} · `}
          sent {day(payout.paid_at)}
        </span>
        {payout.confirmed_at ? (
          <span className="tag bg-mint-tint text-mint">confirmed</span>
        ) : (
          <span className="tag bg-brand-tint text-amber-deep">sent · not confirmed</span>
        )}
        {chase && (
          <a
            href={chase}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin btn-admin-sm shrink-0"
          >
            Chase
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * The same form for adding somebody and for changing them.
 *
 * Saving with a code that already exists changes that promoter rather than
 * making a second one, which is what makes one form enough.
 */
function PromoterForm({
  promoter,
  primary = false,
}: {
  /** Whether this form carries the screen's one red button. */
  primary?: boolean;
  promoter?: {
    code: string;
    name: string;
    phone: string;
    pin?: string;
    handle?: string;
    rate: number;
    box_rate?: number;
    active: boolean;
  };
}) {
  const at = promoter ? `-${promoter.code}` : "";

  return (
    <form action={savePromoter} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* An existing code is carried, not typed. A box you cannot type
            into looks broken on a phone: you tap it and no keyboard comes
            up. Renaming is its own form above, which is a box that works. */}
        {promoter ? (
          <input type="hidden" name="code" value={promoter.code} />
        ) : (
          <div>
            <label className="label" htmlFor={`code${at}`}>
              Code
            </label>
            <input
              id={`code${at}`}
              name="code"
              required
              placeholder="TOBI"
              className="field"
            />
            <p className="hint mt-1">Their sign-in name, not a link for customers.</p>
          </div>
        )}
        <div>
          <label className="label" htmlFor={`name${at}`}>
            Name
          </label>
          <input id={`name${at}`} name="name" defaultValue={promoter?.name} className="field" />
          <p className="hint mt-1">What a customer sees at the checkout.</p>
        </div>
        <div>
          <label className="label" htmlFor={`phone${at}`}>
            Phone
          </label>
          <input id={`phone${at}`} name="phone" defaultValue={promoter?.phone} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`handle${at}`}>
            Their own link
          </label>
          <div className="flex items-center gap-1">
            <span className="whitespace-nowrap text-sm text-muted">sudu.store/s/</span>
            <input
              id={`handle${at}`}
              name="handle"
              defaultValue={promoter?.handle ?? ""}
              placeholder={promoter?.code.toLowerCase() ?? "tobi"}
              className="field min-w-0"
            />
          </div>
          <p className="hint mt-1">
            Letters and numbers only. Anybody who orders after opening it has their name
            already filled in at the checkout, so nobody has to remember to pick it.
            Leave it blank and their code is used.
          </p>
        </div>
        <div>
          <label className="label" htmlFor={`pin${at}`}>
            PIN
          </label>
          <input
            id={`pin${at}`}
            name="pin"
            inputMode="numeric"
            maxLength={4}
            defaultValue={promoter?.pin}
            placeholder="Made up for you"
            className="field"
          />
          <p className="hint mt-1">Four digits, with their code, is how they sign in.</p>
        </div>
        <div>
          <label className="label" htmlFor={`rate${at}`}>
            Per order a customer pays for
          </label>
          <input
            id={`rate${at}`}
            name="rate"
            inputMode="numeric"
            defaultValue={promoter?.rate ?? 500}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={`box_rate${at}`}>
            Per box or collection
          </label>
          <input
            id={`box_rate${at}`}
            name="box_rate"
            inputMode="numeric"
            defaultValue={promoter?.box_rate ?? 1000}
            className="field"
          />
          <p className="hint mt-1">
            What they earn when the order is a packed box: a care package, a hostel pack,
            a gift, a food box. Ordinary food, skincare, parcels and ordering together all
            pay the rate on the left.
          </p>
        </div>
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="active"
          defaultChecked={promoter?.active ?? true}
          className="size-[18px] accent-brand"
        />
        Paying them at the moment
      </label>
      <SaveButton look={primary ? "btn-admin-go" : "btn-admin"}>
        {promoter ? "Save" : "Add them"}
      </SaveButton>
    </form>
  );
}
