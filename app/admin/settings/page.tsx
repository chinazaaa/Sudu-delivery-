import SaveButton from "@/components/SaveButton";
import PageHeader from "@/components/admin/PageHeader";
import BandEditor from "@/components/admin/BandEditor";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { parseBands, SAME_DAY_BANDS, URGENT_EXTRA } from "@/lib/fees";
import { missingSettings } from "@/lib/health";
import { getSettings } from "@/lib/settings";
import { allAccounts } from "@/lib/banks";
import {
  PAID_NOTE_DEFAULT,
  TEMPLATE_DEFAULT,
  TEMPLATE_FIELD,
  TEMPLATE_LABEL,
  TEMPLATE_TOKENS,
  type TemplateKind,
} from "@/lib/messages";
import {
  addBankAccount,
  addHostel,
  deleteBankAccount,
  deleteHostel,
  saveSettings,
  toggleBankAccount,
  toggleHostel,
} from "../actions";
import { listHostels } from "@/lib/hostels";
import { DELIVERY_WINDOWS } from "@/lib/config";

/** Whole hours, named the way somebody says them. */
const HOURS = Array.from({ length: 16 }, (_, index) => {
  const hour = index + 7;
  const suffix = hour >= 12 ? "pm" : "am";
  const shown = hour > 12 ? hour - 12 : hour;
  return { value: String(hour), label: `${shown}${suffix}` };
});

export const dynamic = "force-dynamic";

export default async function SettingsAdmin() {
  const settings = await getSettings();
  const hostels = await listHostels(true);
  // Asked up front, so a box whose column is not there says why rather than
  // taking a line and throwing on save.
  const missing = await missingSettings(["ribbon_text", "offer_code"]);
  // Null means the table is not there yet, which reads differently from an
  // empty list and is worth saying out loud.
  const accounts = await allAccounts();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        detail="Every word on the site, and every message you send. No redeploy, no code."
      />
      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Where they pay</h2>
          <p className="text-sm text-muted">
            Every account somebody can transfer into. The first is the one the
            order page shows and the one your WhatsApp message quotes; the
            rest are one tap away, for anyone who banks where you do and would
            rather send it there.
          </p>
        </div>

        {accounts === null && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            The database has no bank_accounts table yet, so this is still the
            single account below. Run supabase/update.sql and the list starts
            working, with that account already on it.
          </p>
        )}

        {accounts !== null && accounts.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No account on the list, so customers have nowhere to pay. Add one
            before ordering opens.
          </p>
        )}

        <ul className="space-y-2">
          {(accounts ?? []).map((account, index) => (
            <li
              key={account.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                account.active ? "border-black/10" : "border-black/5 bg-black/[0.02]"
              }`}
            >
              <span className={account.active ? "" : "text-muted"}>
                <span className="block font-semibold">
                  {account.bank_name}
                  {index === 0 && account.active && (
                    <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-dark">
                      shown first
                    </span>
                  )}
                  {!account.active && (
                    <span className="ml-2 text-xs font-semibold">hidden</span>
                  )}
                </span>
                <span className="block text-sm text-muted">
                  {account.account_number}
                  {account.account_name && ` · ${account.account_name}`}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                <form action={toggleBankAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <input
                    type="hidden"
                    name="next_active"
                    value={String(!account.active)}
                  />
                  <ActionButton
                    className="chip border-black/10 bg-white py-1.5 text-xs"
                    done="Done ✓"
                  >
                    {account.active ? "Hide" : "Show"}
                  </ActionButton>
                </form>
                <form action={deleteBankAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <ConfirmButton
                    tone="bare"
                    className="chip border-black/10 bg-white py-1.5 text-xs text-brand"
                    confirm={`Yes, remove ${account.bank_name}`}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </span>
            </li>
          ))}
        </ul>

        <form action={addBankAccount} className="grid gap-2 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="bank_name">Bank</label>
            <input
              id="bank_name"
              name="bank_name"
              required
              placeholder="GTBank"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="account_number">Number</label>
            <input
              id="account_number"
              name="account_number"
              required
              inputMode="numeric"
              placeholder="0123456789"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="account_name">Account name</label>
            <input
              id="account_name"
              name="account_name"
              placeholder="Sudu Delivery"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="sort_order">Order</label>
            <input
              id="sort_order"
              name="sort_order"
              inputMode="numeric"
              placeholder="100"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <SaveButton quiet className="px-4 py-2 text-sm">
              Add account
            </SaveButton>
          </div>
        </form>

        <p className="text-xs text-muted">
          Hiding an account takes it off the site and keeps the details.
          Removing it is forever. Neither changes an order somebody has
          already paid.
        </p>
      </section>

      <form action={saveSettings} className="card space-y-3">
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
        <div>
          <h2 className="font-semibold">The strip along the top</h2>
          <p className="text-sm text-muted">
            One line above the header, on every page. It is the place for a
            claim or a piece of news, so keep it to a few words: a strip that
            shouts above every page is a strip people learn to scroll past.
          </p>
        </div>

        {missing.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            The database is missing {missing.join(" and ")}, so there is nowhere
            to keep this yet. Run supabase/update.sql and this box starts
            working.
          </p>
        )}
        <div>
          <label className="label" htmlFor="ribbon_text">What it says</label>
          <input
            id="ribbon_text"
            name="ribbon_text"
            defaultValue={settings.ribbon_text}
            maxLength={70}
            placeholder="Award winning. Since 2021. Sudu is back."
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Empty and there is no strip at all.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="offer_code">A code to announce beside it</label>
          <input
            id="offer_code"
            name="offer_code"
            defaultValue={settings.offer_code}
            placeholder="SUDU500"
            className="field font-mono uppercase"
          />
          <p className="mt-1 text-xs text-muted">
            A code from Codes. The strip reads it for what it is worth and who
            it is for, and says nothing while it is off, expired or used up, so
            there is nothing to remember to take down.
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
        <p className="text-xs text-muted">
          Leave it empty and the line goes. The same is true of the Instagram
          handle and the WhatsApp group link above: each is in the footer
          because it is filled in.
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="hide_footer"
            defaultChecked={settings.hide_footer === "on"}
          />
          Hide the whole footer
        </label>
        <p className="text-xs text-muted">
          The line and all three links go together. The pages keep their
          spacing, so nothing jumps.
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="hide_promoter_link"
            defaultChecked={settings.hide_promoter_link === "on"}
          />
          Hide the Promoters link
        </label>
        <p className="text-xs text-muted">
          Your promoter can still sign in at /promoter. This only takes the
          link out of the footer.
        </p>
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

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">Pick a time, instead of a run</h2>
          <p className="text-sm text-muted">
            A car going out for one order at a time the customer chose, rather than
            everybody sharing one. Nothing is offered sooner than three hours from
            now, because that is how long it takes to fetch and deliver, and when
            today has run out it offers tomorrow instead.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="same_day_on"
            value="on"
            defaultChecked={settings.same_day_on === "on"}
            className="mt-1 size-5 shrink-0 accent-brand"
          />
          <span>
            <span className="block font-semibold">Offer it</span>
            <span className="block text-sm text-muted">
              Switch this off on a day you cannot do it and customers only see the
              runs. Orders already placed are unaffected.
            </span>
          </span>
        </label>

        <div className="border-t border-black/10 pt-3">
          <p className="label">What it costs</p>
          <BandEditor
            initial={
              settings.same_day_bands ? parseBands(settings.same_day_bands) : SAME_DAY_BANDS
            }
            field="same_day_bands"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="same_day_first_hour">
              Earliest delivery
            </label>
            <select
              id="same_day_first_hour"
              name="same_day_first_hour"
              defaultValue={settings.same_day_first_hour || "12"}
              className="field"
            >
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="same_day_last_hour">
              Latest delivery
            </label>
            <select
              id="same_day_last_hour"
              name="same_day_last_hour"
              defaultValue={settings.same_day_last_hour || "18"}
              className="field"
            >
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted">
          Nothing is offered outside these, and nothing anywhere says the hours out
          loud, so changing them here changes what customers read too.
        </p>

        <div>
          <label className="label" htmlFor="same_day_urgent_extra">
            Extra when it is under five hours away
          </label>
          <input
            id="same_day_urgent_extra"
            name="same_day_urgent_extra"
            inputMode="numeric"
            defaultValue={settings.same_day_urgent_extra || String(URGENT_EXTRA)}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Added to every step above. A car that cannot wait is a car doing nothing
            else. Ordering at 9 for noon is inside the five hours; ordering at 9 for
            three o&apos;clock is not.
          </p>
        </div>

        <SaveButton>Save same day prices</SaveButton>
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
