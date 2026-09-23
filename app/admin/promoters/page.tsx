import Link from "next/link";
import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Diagnostic from "@/components/Diagnostic";
import CopyText from "@/components/CopyText";
import RenamePromoter from "@/components/admin/RenamePromoter";
import { promoterRows } from "@/lib/admin";
import { promoterEarnings } from "@/lib/promoters";
import { promoterSchema } from "@/lib/health";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { recordPayout, savePromoter } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The people getting customers onto the site, one card each.
 *
 * It was written for one person and grew a list, so each promoter took a
 * heading, a row of four figures and a card carrying everything about them
 * at once. With four of them that is four screens, and the one number
 * anybody opens this page for, what is owed, was somewhere in the middle of
 * each.
 *
 * So the owed figure leads and everything else folds away. What a promoter
 * needs day to day is: are they earning, do I owe them, and here is their
 * sign-in. The history of what has been paid matters once a month.
 */
export default async function PromotersAdmin({
  searchParams,
}: {
  /** One promoter, or all of them. It lives in the address so a page about
   *  one person can be come back to and reloaded. */
  searchParams: Promise<{ who?: string }>;
}) {
  const who = (await searchParams).who ?? "";
  const schema = await promoterSchema();
  const everybody = schema.ok ? await promoterRows() : [];
  const promoters =
    who === "" ? everybody : everybody.filter((one) => one.code === who);
  // Run by run, from the same place each promoter sees it, so the two agree.
  const perRun = new Map(
    await Promise.all(
      promoters.map(async (one) => [one.code, await promoterEarnings(one.code)] as const)
    )
  );
  const url = await siteUrl();

  // About everybody, whoever is being looked at: the question "what do I owe
  // in total" does not change because the page is showing one person.
  const owed = everybody.reduce((total, one) => total + one.owed, 0);
  const earning = everybody.filter((one) => one.orders > 0).length;

  return (
    <div>
      <PageHeader
        title="Promoters"
        detail="A customer belongs to whoever brought them, for life, and every order they pay for counts at that promoter's rate."
      />

      {!schema.ok && (
        <div className="mb-4">
          <Diagnostic
            title="This database is missing something"
            detail={`Saving a promoter will not work until ${schema.missing} exists. Run supabase/promoter_setup.sql in Supabase, then come back.`}
          />
        </div>
      )}

      {/* The whole page in three numbers. Owed is the one anybody opens this
          for, so it is the one that is coloured. */}
      {everybody.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Promoting" value={everybody.length} />
          <Stat label="With orders" value={earning} />
          <Stat label="Owed in total" value={owed} money tone={owed > 0 ? "warn" : "good"} />
        </div>
      )}

      {/* At the top, folded. Adding somebody is a thing you come to this
          page to do, and it was underneath however many promoters there
          already were, which is the wrong way round: the more of them there
          are, the further it moved. */}
      <details className="card mb-3" open={everybody.length === 0}>
        <summary className="cursor-pointer font-bold">Add a promoter</summary>
        <PromoterForm />
      </details>

      {/* One at a time once there are a few. A form rather than a script, so
          it works before anything has loaded and the choice stays in the
          address afterwards. */}
      {everybody.length > 1 && (
        <form action="/admin/promoters" className="mb-3 flex flex-wrap items-center gap-2">
          <label className="label mb-0" htmlFor="who">
            Showing
          </label>
          <select id="who" name="who" defaultValue={who} className="field w-auto py-2 text-sm">
            <option value="">Everybody ({everybody.length})</option>
            {everybody.map((one) => (
              <option key={one.code} value={one.code}>
                {one.name || one.code}
                {one.owed > 0 ? ` · ${naira(one.owed)} owed` : ""}
              </option>
            ))}
          </select>
          <button className="btn-quiet px-4 py-2 text-sm">Show</button>
          {who !== "" && (
            <a href="/admin/promoters" className="text-sm font-semibold text-muted underline">
              Back to everybody
            </a>
          )}
        </form>
      )}

      <div className="space-y-3">
        {promoters.map((promoter) => {
          const earnings = perRun.get(promoter.code) ?? null;
          const toSettle = (earnings?.runs ?? []).filter((run) => run.earned > run.paidOut);

          // Everything they need in one message, because half of it is
          // useless alone: a PIN with no code, or a code with no page to put
          // it into.
          const brief =
            `Hi ${promoter.name || "there"}, you are promoting Sudu.\n\n` +
            `You earn ${naira(promoter.rate)} on every order a customer you brought pays ` +
            `for, for as long as they keep ordering.\n\n` +
            `See what you have earned: ${url}/promoter\n` +
            `Code: ${promoter.code}\n` +
            `PIN: ${promoter.pin || "ask us"}\n\n` +
            `Tell people to pick "${promoter.name || promoter.code}" at the checkout, ` +
            `under "Where did you hear about us?". That is what puts them on your list.`;

          return (
            <article key={promoter.code} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">
                    {promoter.name || promoter.code}
                    {!promoter.active && (
                      <span className="ml-2 chip border-black/10 bg-shell text-xs">
                        Not being paid
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted">
                    {promoter.code} · PIN{" "}
                    <span className="font-bold tracking-wider">
                      {promoter.pin || "not set"}
                    </span>{" "}
                    · {naira(promoter.rate)} an order
                  </p>
                </div>

                {/* What is owed, large, because it is the decision. The rest
                    is how it was arrived at. */}
                <div className="text-right">
                  <p
                    className={`text-lg font-extrabold ${
                      promoter.owed > 0 ? "text-brand-dark" : "text-mint"
                    }`}
                  >
                    {promoter.owed > 0 ? `${naira(promoter.owed)} owed` : "Settled up"}
                  </p>
                  <p className="text-xs text-muted">
                    {promoter.orders} order{promoter.orders === 1 ? "" : "s"} ·{" "}
                    {naira(promoter.earned)} earned · {naira(promoter.paidOut)} paid
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* The orders behind the number. Commission is worked out per
                    order, so the list has to be reachable from the figure. */}
                <Link
                  href={`/admin/orders?status=all&promoter=${encodeURIComponent(
                    promoter.code
                  )}`}
                  className="chip border-black/10 bg-white hover:border-ink/30"
                >
                  See their orders
                </Link>
                <a
                  href={
                    promoter.phone
                      ? whatsappTo(promoter.phone, brief)
                      : `https://wa.me/?text=${encodeURIComponent(brief)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip border-black/10 bg-white hover:border-ink/30"
                >
                  {promoter.phone ? "Send their details" : "Share their details"}
                </a>
                <CopyText value={brief} label="Copy" className="px-3 py-1.5 text-sm" />
                {promoter.phone && (
                  <a
                    href={`tel:${promoter.phone}`}
                    className="chip border-black/10 bg-white hover:border-ink/30"
                  >
                    Call
                  </a>
                )}
                {!promoter.phone && (
                  <span className="text-xs text-muted">
                    No number saved, so WhatsApp will ask which chat.
                  </span>
                )}
              </div>

              {/* One tap each, and exactly what that run is worth against
                  that run. On the card rather than folded away, because it
                  is the thing being done. */}
              {toSettle.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {toSettle.map((run) => (
                    <li
                      key={run.batchId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-shell p-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {run.label}
                        </span>
                        <span className="block text-xs text-muted">
                          {run.orders} order{run.orders === 1 ? "" : "s"}
                          {run.paidOut > 0 && ` · ${naira(run.paidOut)} already paid`}
                        </span>
                      </span>
                      <form action={recordPayout} className="shrink-0">
                        <input type="hidden" name="code" value={promoter.code} />
                        <input type="hidden" name="batch_id" value={run.batchId} />
                        <input type="hidden" name="amount" value={run.earned - run.paidOut} />
                        <input type="hidden" name="note" value={run.label} />
                        <SaveButton quiet className="px-3 py-1.5 text-sm">
                          Pay {naira(run.earned - run.paidOut)}
                        </SaveButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {/* Everything a month-end needs, and nothing a Tuesday does. */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                  Paying them
                </summary>

                <div className="mt-3 space-y-3">
                  <div className="rounded-xl bg-shell p-3 text-sm">
                    <p className="font-bold">Send it here</p>
                    {promoter.bank_account_number ? (
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <p>
                          <span className="block font-semibold">
                            {promoter.bank_account_number}
                          </span>
                          <span className="block text-muted">
                            {promoter.bank_account_name || promoter.name}
                            {promoter.bank_name && ` · ${promoter.bank_name}`}
                          </span>
                        </p>
                        {/* Ten digits read off one screen and typed into a
                            banking app is where a payout goes to the wrong
                            person. One tap instead. */}
                        <CopyText
                          value={promoter.bank_account_number}
                          label="Copy"
                          className="shrink-0 px-3 py-1.5 text-xs"
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-muted">
                        They have not filled their account details in yet. They
                        do that themselves, on their own page.
                      </p>
                    )}
                  </div>

                  <form action={recordPayout} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="code" value={promoter.code} />
                    <div className="w-32">
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
                    <div className="grow">
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
                    <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                      Record it
                    </SaveButton>
                  </form>
                  <p className="text-xs text-muted">
                    Recording it takes it off what they are owed, here and on
                    their own page. The buttons above do the same thing for one
                    run; this is for anything that does not fit one.
                  </p>

                  {promoter.payouts.length > 0 && (
                    <div>
                      <p className="label mb-0">Already paid out</p>
                      <ul className="divide-y divide-black/5 text-sm">
                        {promoter.payouts.map((payout) => (
                          <li key={payout.id} className="flex justify-between gap-3 py-2">
                            <span>
                              {new Date(payout.paid_at).toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                              })}
                              {payout.note && (
                                <span className="text-muted"> · {payout.note}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold">{naira(payout.amount)}</span>
                              <span
                                className={`chip border-transparent text-xs font-semibold ${
                                  payout.confirmed_at
                                    ? "bg-mint/20"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {payout.confirmed_at ? "Confirmed" : "Not confirmed"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>

              {/* Their own details, under the same fold, because changing a
                  rate is a once-a-year thing and it is the form that adds
                  somebody: an existing code changes that one. */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                  Change their details
                </summary>
                {/* First, because it is the field people go looking for.
                    Its own form, because it is the one thing here that can
                    break somebody's earnings: every customer they have ever
                    brought points at that code. */}
                <RenamePromoter code={promoter.code} />

                <PromoterForm promoter={promoter} />
              </details>
            </article>
          );
        })}
      </div>

      {everybody.length === 0 && (
        <p className="card mb-4 text-sm text-muted">
          Nobody is promoting yet. Whoever you add below appears at the
          checkout, under &quot;Where did you hear about us?&quot;, and every
          customer who names them is theirs for life.
        </p>
      )}

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
}: {
  promoter?: {
    code: string;
    name: string;
    phone: string;
    pin?: string;
    rate: number;
    active: boolean;
  };
}) {
  const at = promoter ? `-${promoter.code}` : "";

  return (
    <form action={savePromoter} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* An existing code is carried, not typed. A box you cannot type
            into looks broken on a phone: you tap it and no keyboard comes
            up. Renaming is the form above, which is a box that works. */}
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
            <p className="mt-1 text-xs text-muted">
              Their sign-in name, not a link for customers.
            </p>
          </div>
        )}
        <div>
          <label className="label" htmlFor={`name${at}`}>
            Name
          </label>
          <input id={`name${at}`} name="name" defaultValue={promoter?.name} className="field" />
          <p className="mt-1 text-xs text-muted">
            What a customer sees at the checkout.
          </p>
        </div>
        <div>
          <label className="label" htmlFor={`phone${at}`}>
            Phone
          </label>
          <input id={`phone${at}`} name="phone" defaultValue={promoter?.phone} className="field" />
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
          <p className="mt-1 text-xs text-muted">
            Four digits, with their code, is how they sign in.
          </p>
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
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="active" defaultChecked={promoter?.active ?? true} />
        Paying them at the moment
      </label>
      <SaveButton>{promoter ? "Save" : "Add them"}</SaveButton>
    </form>
  );
}
