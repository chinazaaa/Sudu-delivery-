import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { promoterRows } from "@/lib/admin";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { recordPayout, savePromoter } from "../actions";

export const dynamic = "force-dynamic";

export default async function PromotersAdmin() {
  const promoters = await promoterRows();
  const promoter = promoters[0] ?? null;
  const url = await siteUrl();

  return (
    <div>
      <PageHeader
        title="Promoter"
        detail="The person whose job is getting people onto the site. Every paid order counts, at their rate."
      />

      {promoter && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Paid orders" value={promoter.orders} />
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
                <label className="label" htmlFor="amount">Paid them</label>
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
            <label className="label" htmlFor="rate">Per paid order</label>
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
