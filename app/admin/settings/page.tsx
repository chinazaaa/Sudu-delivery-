import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import BandEditor from "@/components/admin/BandEditor";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { parseBands } from "@/lib/fees";
import { getSettings, hasBankDetails } from "@/lib/settings";
import {
  PAID_NOTE_DEFAULT,
  TEMPLATE_DEFAULT,
  TEMPLATE_FIELD,
  TEMPLATE_LABEL,
  TEMPLATE_TOKENS,
  type TemplateKind,
} from "@/lib/messages";
import { addHostel, deleteHostel, saveSettings, toggleHostel } from "../actions";
import { listHostels } from "@/lib/hostels";
import { DELIVERY_WINDOWS } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SettingsAdmin() {
  const settings = await getSettings();
  const hostels = await listHostels(true);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        detail="Every word on the site, and every message you send. No redeploy, no code."
      />
      {!hasBankDetails(settings) && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No bank details set yet, so customers have nowhere to pay. Fill these in
          before ordering opens.
        </p>
      )}

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
        <p className="text-sm text-muted">
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
          <p className="mt-1 text-xs text-muted">
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

        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Where to find us</h2>
        <p className="text-sm text-muted">
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
          <p className="mt-1 text-xs text-muted">
            The group is the distribution. Leave blank to hide the link.
          </p>
        </div>
        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Footer line</h2>
        <p className="text-sm text-muted">
          The line at the bottom of every page.
        </p>
        <input name="footer_line" defaultValue={settings.footer_line} className="field" />
        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">Product page notes</h2>
        <p className="text-sm text-muted">
          The reassurance lines under the buy button, one per line. Write{" "}
          {"{restaurant}"} and the restaurant&apos;s name is filled in.
        </p>
        <textarea
          name="product_notes"
          defaultValue={settings.product_notes}
          rows={4}
          className="field"
        />
        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">When runs land</h2>
          <p className="text-sm text-muted">
            What customers are told about a new run, before you change it on
            the run itself. It is the {"{window}"} in your messages.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="window_afternoon">Afternoon runs</label>
            <input
              id="window_afternoon"
              name="window_afternoon"
              defaultValue={settings.window_afternoon || DELIVERY_WINDOWS.afternoon}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="window_night">Night runs</label>
            <input
              id="window_night"
              name="window_night"
              defaultValue={settings.window_night || DELIVERY_WINDOWS.night}
              className="field"
            />
          </div>
        </div>
        <div className="w-44">
          <label className="label" htmlFor="order_horizon_days">
            Customers can order
          </label>
          <input
            id="order_horizon_days"
            name="order_horizon_days"
            inputMode="numeric"
            defaultValue={settings.order_horizon_days}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">Days ahead.</p>
        </div>
        <SaveButton>Save</SaveButton>
        <p className="text-xs text-muted">
          A run already created keeps the wording it was created with; change
          that one on the run itself, under Controls. Runs are created three
          weeks ahead either way, so you can plan them; the number above only
          decides how far ahead a customer is offered one.
        </p>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">Who gets told</h2>
          <p className="text-sm text-muted">
            Every admin who should hear when an order lands and when a cart is
            left behind. One address per line. Customers are never emailed:
            they are messaged on WhatsApp, by you.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="admin_emails">Admin emails</label>
          <textarea
            id="admin_emails"
            name="admin_emails"
            defaultValue={settings.admin_emails}
            rows={3}
            placeholder={"you@sudu.ng\nsecond@sudu.ng"}
            className="field"
          />
        </div>
        <div className="w-40">
          <label className="label" htmlFor="abandon_minutes">
            Abandoned after
          </label>
          <input
            id="abandon_minutes"
            name="abandon_minutes"
            inputMode="numeric"
            defaultValue={settings.abandon_minutes}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">Minutes untouched.</p>
        </div>
        <SaveButton>Save</SaveButton>
        <p className="text-xs text-muted">
          Email needs RESEND_API_KEY set where the site is hosted. Without it
          nothing is emailed and every cart still shows under Left behind. The
          recap goes out once a day, scheduled from Supabase with
          supabase/cron.sql.
        </p>
      </form>

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Where you deliver</h2>
          <p className="text-sm text-muted">
            The blocks a customer picks from at checkout. With nothing on this
            list they type their own, which is how a hostel ends up spelt four
            ways on one run sheet.
          </p>
        </div>

        <ul className="space-y-2">
          {hostels.map((hostel) => (
            <li
              key={hostel.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2"
            >
              <span className={hostel.active ? "font-semibold" : "text-muted line-through"}>
                {hostel.name}
                {hostel.note && <span className="font-normal text-muted"> · {hostel.note}</span>}
              </span>
              <span className="flex gap-2">
                <form action={toggleHostel}>
                  <input type="hidden" name="hostel_id" value={hostel.id} />
                  <input type="hidden" name="active" value={String(!hostel.active)} />
                  <ActionButton
                    className="chip border-black/10 bg-white py-1.5 text-xs"
                    done="Done ✓"
                  >
                    {hostel.active ? "Hide" : "Show"}
                  </ActionButton>
                </form>
                <form action={deleteHostel}>
                  <input type="hidden" name="hostel_id" value={hostel.id} />
                  <ConfirmButton
                    tone="bare"
                    className="chip border-black/10 bg-white py-1.5 text-xs text-brand"
                    confirm={`Yes, remove ${hostel.name}`}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </span>
            </li>
          ))}
          {hostels.length === 0 && (
            <li className="text-sm text-muted">
              Nothing yet, so customers type their block by hand.
            </li>
          )}
        </ul>

        <form action={addHostel} className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label" htmlFor="hostel-name">Block name</label>
            <input
              id="hostel-name"
              name="name"
              required
              placeholder="Trinity Hall"
              className="field py-2 text-sm"
            />
          </div>
          <div className="w-24">
            <label className="label" htmlFor="hostel-sort">Order</label>
            <input
              id="hostel-sort"
              name="sort_order"
              inputMode="numeric"
              placeholder="100"
              className="field py-2 text-sm"
            />
          </div>
          <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
            Add block
          </SaveButton>
        </form>

        <p className="text-xs text-muted">
          Removing a block never changes an old order: every order keeps the
          block it was placed with.
        </p>
      </section>

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">What delivery costs</h2>
          <p className="text-sm text-muted">
            Delivery is priced by how many containers travel, not by what the
            food costs. Set the bands here and the shop, the cart and every
            new order follow them.
          </p>
        </div>
        <BandEditor initial={parseBands(settings.fee_bands)} />
        <SaveButton>Save prices</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-4">
        <div>
          <h2 className="font-semibold">WhatsApp messages</h2>
          <p className="text-sm text-muted">
            The words behind every template button in Orders. Edit them and the
            buttons say what you want. Leave one blank to go back to the wording
            underneath it.
          </p>
        </div>

        <div className="rounded-2xl bg-shell p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Things you can drop into a message
          </p>
          <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            {TEMPLATE_TOKENS.map((item) => (
              <li key={item.token}>
                <code className="font-bold">{item.token}</code>
                <span className="text-muted"> {item.means}</span>
              </li>
            ))}
          </ul>
        </div>

        {(["confirmed", "payment", "card", "pin", "ready", "late"] as TemplateKind[]).map(
          (kind) => (
            <div key={kind}>
              <label className="label" htmlFor={`msg-${kind}`}>
                {TEMPLATE_LABEL[kind]}
              </label>
              <textarea
                id={`msg-${kind}`}
                name={TEMPLATE_FIELD[kind]}
                // The wording that is actually in use, so editing it is a
                // change rather than writing the whole message again.
                defaultValue={
                  String(settings[TEMPLATE_FIELD[kind]] ?? "") || TEMPLATE_DEFAULT[kind]
                }
                rows={4}
                className="field font-mono text-sm"
              />
            </div>
          )
        )}

        <SaveButton>Save messages</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">What a paid customer reads</h2>
        <p className="text-sm text-muted">
          The line on their order page once the money lands. It takes the same
          {" "}{"{hostel}"}, {"{window}"}, {"{ref}"} and {"{name}"} as the messages.
        </p>
        <textarea
          name="paid_note"
          defaultValue={settings.paid_note || PAID_NOTE_DEFAULT}
          rows={2}
          className="field"
        />
        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-semibold">The line under the headline</h2>
        <p className="text-sm text-muted">
          The first thing a student reads. Reword it whenever the pitch changes.
        </p>
        <textarea
          name="pitch_line"
          defaultValue={settings.pitch_line}
          rows={2}
          className="field"
        />
        <SaveButton>Save</SaveButton>
      </form>
    </div>
  );
}
