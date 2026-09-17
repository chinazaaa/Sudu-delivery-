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
  const first = promoters[0] ?? null;
  // Run by run, from the same place the promoter sees it, so the two agree.
  const earnings = first && schema.ok ? await promoterEarnings(first.code) : null;
  const promoter = promoters[0] ?? null;
  const url = await siteUrl();

  return (
    <div>
      <PageHeader
        title="Promoter"
        detail="The person whose job is getting people onto the site. Every order a customer pays for counts, at their rate."
      />

      {!schema.ok && (
        <div className="mb-4">
          <Diagnostic
            title="This database is missing something"
            detail={`Saving a promoter will not work until ${schema.missing} exists. Run supabase/promoter_setup.sql in Supabase, then come back.`}
          />
        </div>
      )}

      {promoter && (
        <>
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
        </>
      )}

      <form action={savePromoter} className="card space-y-3">
        <h2 className="font-bold">{promoter ? "Their details" : "Set up your promoter"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input
              id="code"
              name="code"
              required
              defaultValue={promoter?.code}
              placeholder="TOBI"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Their sign-in name, not a link for customers.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={promoter?.name} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={promoter?.phone} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="pin">PIN</label>
            <input
              id="pin"
              name="pin"
              inputMode="numeric"
              maxLength={4}
              defaultValue={promoter?.pin}
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
              defaultValue={promoter?.rate ?? 500}
              className="field"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={promoter?.active ?? true} />
          Paying them at the moment
        </label>
        <SaveButton>{promoter ? "Save" : "Set them up"}</SaveButton>
      </form>
    </div>
  );
}
