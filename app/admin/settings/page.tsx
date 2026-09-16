import { getSettings, hasBankDetails } from "@/lib/settings";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsAdmin() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Site settings</h1>
        <p className="text-sm text-ink/60">
          These appear on every order&apos;s pay page. Change them here. No redeploy,
          no code.
        </p>
        {!hasBankDetails(settings) && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No bank details set yet, so customers have nowhere to pay. Fill these in
            before ordering opens.
          </p>
        )}
      </section>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Bank transfer</h2>
        <div>
          <label className="label" htmlFor="bank_name">Bank</label>
          <input
            id="bank_name"
            name="bank_name"
            defaultValue={settings.bank_name}
            placeholder="GTBank"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="bank_account_name">Account name</label>
          <input
            id="bank_account_name"
            name="bank_account_name"
            defaultValue={settings.bank_account_name}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="bank_account_number">Account number</label>
          <input
            id="bank_account_number"
            name="bank_account_number"
            defaultValue={settings.bank_account_number}
            inputMode="numeric"
            className="field"
          />
        </div>

        <h2 className="border-t border-black/10 pt-3 font-semibold">Paying by card</h2>
        <p className="text-sm text-ink/60">
          Card payers are told to message you. You send them a link, then mark the
          order paid on its batch page when the money lands.
        </p>
        <div>
          <label className="label" htmlFor="whatsapp_number">WhatsApp number</label>
          <input
            id="whatsapp_number"
            name="whatsapp_number"
            defaultValue={settings.whatsapp_number}
            placeholder="0803 123 4567"
            inputMode="tel"
            className="field"
          />
          <p className="mt-1 text-xs text-ink/50">
            Leave blank to hide the card option entirely.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="card_note">What the customer reads</label>
          <textarea
            id="card_note"
            name="card_note"
            defaultValue={settings.card_note}
            rows={2}
            className="field"
          />
        </div>

        <button className="btn-primary">Save</button>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Where to find us</h2>
        <p className="text-sm text-ink/60">
          Shown at the bottom of every page. A stranger asked to prepay ₦16,000 will
          check that the business exists, and these are what they check.
        </p>
        <div>
          <label className="label" htmlFor="instagram_handle">Instagram handle</label>
          <input
            id="instagram_handle"
            name="instagram_handle"
            defaultValue={settings.instagram_handle}
            placeholder="sudu.ng"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp_group_link">
            PAU WhatsApp group link
          </label>
          <input
            id="whatsapp_group_link"
            name="whatsapp_group_link"
            defaultValue={settings.whatsapp_group_link}
            placeholder="https://chat.whatsapp.com/…"
            className="field"
          />
          <p className="mt-1 text-xs text-ink/50">
            The group is the distribution. Leave blank to hide the link.
          </p>
        </div>
        <button className="btn-primary">Save</button>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Product page notes</h2>
        <p className="text-sm text-ink/60">
          The reassurance lines under the buy button, one per line. Write{" "}
          {"{restaurant}"} and the restaurant&apos;s name is filled in.
        </p>
        <textarea
          name="product_notes"
          defaultValue={settings.product_notes}
          rows={4}
          className="field"
        />
        <button className="btn-primary">Save</button>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">The line under the headline</h2>
        <p className="text-sm text-ink/60">
          The first thing a student reads. Reword it whenever the pitch changes.
        </p>
        <textarea
          name="pitch_line"
          defaultValue={settings.pitch_line}
          rows={2}
          className="field"
        />
        <button className="btn-primary">Save</button>
      </form>
    </div>
  );
}
