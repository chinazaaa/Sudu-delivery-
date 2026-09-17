import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import { promoterRows } from "@/lib/admin";
import { naira } from "@/lib/money";
import { whatsappTo } from "@/lib/messages";
import { siteUrl } from "@/lib/admin-templates";
import { recordPayout, savePromoter, saveSettings } from "../actions";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PromotersAdmin() {
  const promoters = await promoterRows();
  const settings = await getSettings();
  const url = await siteUrl();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Promoters"
        detail="Give codes to a handful of people, not everyone. An order counts for the life of that customer, because attribution sticks to their phone number."
      />

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">Who every order counts for</h2>
          <p className="text-sm text-muted">
            With one promoter sharing the link, every order is their doing,
            whether or not the link somebody opened still had a code on the end
            of it. Pick them here and all of it counts. The first-order
            discount still needs a real code in the link, so it stays a reason
            to use one.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label" htmlFor="default_promoter_code">Promoter</label>
            <select
              id="default_promoter_code"
              name="default_promoter_code"
              defaultValue={settings.default_promoter_code}
              className="field"
            >
              <option value="">Nobody: only orders with a code count</option>
              {promoters.map((promoter) => (
                <option key={promoter.code} value={promoter.code}>
                  {promoter.name} ({promoter.code})
                </option>
              ))}
            </select>
          </div>
          <SaveButton className="shrink-0">Save</SaveButton>
        </div>
      </form>

      {promoters.map((promoter) => (
        <form key={promoter.code} action={savePromoter} className="card space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">{promoter.code}</h2>
            <p className="text-sm">
              {promoter.orders} paid order{promoter.orders === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold">{naira(promoter.owed)}</span> owed
            </p>
          </div>
          <p className="text-sm text-muted">
            {naira(promoter.earned)} earned, {naira(promoter.paidOut)} paid out.
          </p>
          <p className="break-all text-xs text-muted">
            Their link: {url}/?ref={promoter.code}
          </p>
          <input type="hidden" name="code" value={promoter.code} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label">Name</label>
              <input name="name" defaultValue={promoter.name} className="field" />
            </div>
            <div className="w-36">
              <label className="label">Phone</label>
              <input name="phone" defaultValue={promoter.phone} className="field" />
            </div>
            <div className="w-24">
              <label className="label">Rate</label>
              <input name="rate" inputMode="numeric" defaultValue={promoter.rate} className="field" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={promoter.active} />
              Active
            </label>
            <SaveButton quiet>Save</SaveButton>
          </div>
        </form>
      ))}

      {promoters.map((promoter) => (
        <section key={`pay-${promoter.code}`} className="card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">Paying {promoter.name}</h2>
            <span className="font-extrabold">{naira(promoter.owed)} owed</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-black/10 bg-shell">
              Their PIN{" "}
              <span className="font-black tracking-wider">{promoter.pin || "not set"}</span>
            </span>
            {promoter.phone && (
              <a
                href={whatsappTo(
                  promoter.phone,
                  `Hi ${promoter.name}, your Sudu promoter code is ${promoter.code} ` +
                    `and your PIN is ${promoter.pin}.\n\n` +
                    `See every run your orders landed in, and what you have earned: ` +
                    `${url}/promoter\n\n` +
                    `Your link to share: ${url}/?ref=${promoter.code}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="chip border-black/10 bg-white hover:border-ink/30"
              >
                Send code and PIN
              </a>
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
            Recording it takes it off what they are owed, on their page as well
            as this one.
          </p>
        </section>
      ))}

      <form action={savePromoter} className="card space-y-2">
        <h2 className="font-semibold">Add a promoter</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="label">Code</label>
            <input name="code" placeholder="TOLU" className="field" />
          </div>
          <div className="grow">
            <label className="label">Name</label>
            <input name="name" className="field" />
          </div>
          <div className="w-36">
            <label className="label">Phone</label>
            <input name="phone" className="field" />
          </div>
          <div className="w-24">
            <label className="label">Rate</label>
            <input name="rate" inputMode="numeric" defaultValue={500} className="field" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Active
          </label>
          <SaveButton>Add</SaveButton>
        </div>
      </form>
    </div>
  );
}
