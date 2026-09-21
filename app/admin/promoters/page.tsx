import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Diagnostic from "@/components/Diagnostic";
import { promoterRows } from "@/lib/admin";
import { promoterEarnings } from "@/lib/promoters";
import { promoterSchema } from "@/lib/health";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { recordPayout, savePromoter } from "../actions";

export const dynamic = "force-dynamic";

export default async function PromotersAdmin() {
  const schema = await promoterSchema();
  const promoters = schema.ok ? await promoterRows() : [];
  // Run by run, from the same place each promoter sees it, so the two agree.
  const perRun = new Map(
    await Promise.all(
      promoters.map(
        async (one) => [one.code, await promoterEarnings(one.code)] as const
      )
    )
  );
  const url = await siteUrl();

  return (
    <div>
      <PageHeader
        title="Promoter"
        detail="The people whose job is getting customers onto the site. A customer belongs to whoever brought them, for life, and every order they pay for counts at that promoter's rate."
      />

      {!schema.ok && (
        <div className="mb-4">
          <Diagnostic
            title="This database is missing something"
            detail={`Saving a promoter will not work until ${schema.missing} exists. Run supabase/promoter_setup.sql in Supabase, then come back.`}
          />
        </div>
      )}

      {promoters.map((promoter) => {
        const earnings = perRun.get(promoter.code) ?? null;
        return (
        <section key={promoter.code} className="mb-5">
          <h2 className="mb-2 font-extrabold">
            {promoter.name || promoter.code}
            {!promoter.active && (
              <span className="ml-2 chip border-black/10 bg-shell text-xs">
                Not being paid
              </span>
            )}
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Orders counted" value={promoter.orders} />
            <Stat label="Earned" value={promoter.earned} money />
            <Stat label="Paid out" value={promoter.paidOut} money />
            <Stat
              label="Owed"
              value={promoter.owed}
              money
              tone={promoter.owed > 0 ? "warn" : "good"}
            />
          </div>

          <section className="card mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-black/10 bg-shell">
                Their PIN{" "}
                <span className="font-black tracking-wider">
                  {promoter.pin || "not set"}
                </span>
              </span>
              {promoter.phone && (
                <a
                  href={whatsappTo(
                    promoter.phone,
                    `Hi ${promoter.name}, you can see what you have earned here: ` +
                      `${url}/promoter\n\n` +
                      `Your code is ${promoter.code} and your PIN is ${promoter.pin}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip border-black/10 bg-white hover:border-ink/30"
                >
                  Send their sign-in
                </a>
              )}
            </div>

            <form action={recordPayout} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="code" value={promoter.code} />
              <div className="w-32">
                <label className="label" htmlFor="amount">Paid out to them</label>
                <input
                  id="amount"
                  name="amount"
                  inputMode="numeric"
                  placeholder={String(promoter.owed || 0)}
                  className="field py-2 text-sm"
                />
              </div>
              <div className="grow">
                <label className="label" htmlFor="note">Note</label>
                <input
                  id="note"
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
              Recording it takes it off what they are owed, here and on their
              own page.
            </p>

            {earnings && earnings.runs.some((run) => run.earned > run.paidOut) && (
              <div>
                <h3 className="text-sm font-bold">Runs still to settle</h3>
                <ul className="mt-1 space-y-2">
                  {earnings.runs
                    .filter((run) => run.earned > run.paidOut)
                    .map((run) => (
                      <li
                        key={run.batchId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-shell p-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {run.label}
                          </span>
                          <span className="block text-xs text-muted">
                            {run.orders} order{run.orders === 1 ? "" : "s"} counted
                            {run.paidOut > 0 && ` · ${naira(run.paidOut)} already paid out`}
                          </span>
                        </span>
                        <form action={recordPayout} className="shrink-0">
                          <input type="hidden" name="code" value={promoter.code} />
                          <input type="hidden" name="batch_id" value={run.batchId} />
                          <input
                            type="hidden"
                            name="amount"
                            value={run.earned - run.paidOut}
                          />
                          <input type="hidden" name="note" value={run.label} />
                          <SaveButton quiet className="px-3 py-1.5 text-sm">
                            Pay out {naira(run.earned - run.paidOut)}
                          </SaveButton>
                        </form>
                      </li>
                    ))}
                </ul>
                <p className="mt-1 text-xs text-muted">
                  One tap records exactly what that run is worth, against that
                  run. The box above is for anything that does not fit.
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-shell p-3">
              <h3 className="text-sm font-bold">Send it here</h3>
              {promoter.bank_account_number ? (
                <p className="mt-1 text-sm">
                  <span className="block font-semibold">
                    {promoter.bank_account_number}
                  </span>
                  <span className="block text-muted">
                    {promoter.bank_account_name || promoter.name}
                    {promoter.bank_name && ` · ${promoter.bank_name}`}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  They have not filled their account details in yet. They do
                  that themselves, on their own page.
                </p>
              )}
            </div>

            {promoter.payouts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold">Already paid out</h3>
                <ul className="mt-1 divide-y divide-black/5 text-sm">
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
                          {payout.confirmed_at ? "They confirmed it" : "Not confirmed"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </section>
        );
      })}

      {promoters.length === 0 && (
        <p className="card mb-4 text-sm text-muted">
          Nobody is promoting yet. Whoever you add below appears at the
          checkout, under &quot;Where did you hear about us?&quot;, and every
          customer who names them is theirs for life.
        </p>
      )}

      {/* Blank, always, because it is for adding somebody. Editing one of
          the people above is the same form with their code in it, which is
          why saving with an existing code changes that promoter rather than
          making a second one. */}
      <form action={savePromoter} className="card space-y-3">
        <h2 className="font-bold">Add a promoter</h2>
        <p className="text-sm text-muted">
          Put an existing code in to change that one instead.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input
              id="code"
              name="code"
              required
              
              placeholder="TOBI"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Their sign-in name, not a link for customers.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name"  className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone"  className="field" />
          </div>
          <div>
            <label className="label" htmlFor="pin">PIN</label>
            <input
              id="pin"
              name="pin"
              inputMode="numeric"
              maxLength={4}
              
              placeholder="Made up for you"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Four digits, with their code, is how they sign in. Leave it
              alone and one is made up for you.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="rate">Per order a customer pays for</label>
            <input
              id="rate"
              name="rate"
              inputMode="numeric"
              defaultValue={500}
              className="field"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked />
          Paying them at the moment
        </label>
        <SaveButton>Save them</SaveButton>
      </form>
    </div>
  );
}
