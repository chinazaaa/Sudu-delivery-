import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import { naira } from "@/lib/money";
import SaveButton from "@/components/SaveButton";
import BandEditor from "@/components/admin/BandEditor";
import AreaEditor from "@/components/admin/AreaEditor";
import { parseAreas } from "@/lib/areas";
import DayHours from "@/components/admin/DayHours";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { parseBands, SAME_DAY_BANDS, URGENT_EXTRA } from "@/lib/fees";
import { missingSettings } from "@/lib/health";
import { muted } from "@/lib/email";
import { getSettings, googleQuotes } from "@/lib/settings";
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
import NotifyPhone from "@/components/admin/NotifyPhone";
import { adminPhones } from "@/lib/admin-alerts";

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
  // The three review slots, as the form draws them.
  const quotes = googleQuotes(settings.google_quotes);
  const hostels = await listHostels(true);
  // Asked up front, so a box whose column is not there says why rather than
  // taking a line and throwing on save.
  const missing = await missingSettings(["ribbon_text", "offer_code"]);
  // Null means the table is not there yet, which reads differently from an
  // empty list and is worth saying out loud.
  const accounts = await allAccounts();
  // The phones that buzz. Read here rather than in the control, because the
  // control is a client component and the list is the shop's, not the
  // browser's: a phone subscribed at the counter shows on the laptop too.
  const phones = await adminPhones();

  return (
    <div>
      <PageHeader
        title="Settings"
        detail="Everything that is true across the whole shop. Every word on the site, and every message you send. No redeploy, no code."
      />

      {/* The board's filter pills, drawn at the board's thirty-eight pixels,
          but they jump rather than filter: each card below keeps its own
          values and its own save button, and hiding a card behind a tab
          would hide a save somebody had already typed into. They are in the
          board's order, and none of them is ever drawn as the one you are
          looking at: an active pill means knowing which card is under the top
          of the window, which is a scroll listener and a client component, and
          this page is a server one with eighteen forms on it. A jump link that
          lies about where you are is worse than one that says nothing.

          The board also puts one "Save changes" in the header. There are
          eighteen separate forms on this page, so one button would read
          every field on all eighteen and write them together: somebody who
          came to change the ribbon text would silently commit whatever was
          half-typed in the seventeen cards they never looked at. Each card
          keeps its own save, and the Tomato is per card, where it is still
          the single thing to do next. */}
      <nav aria-label="Jump to a section" className="mb-[18px] flex flex-wrap gap-2">
        {[
          ["#find-us", "Business"],
          ["#pay", "Money"],
          ["#strip", "The site"],
          ["#messages", "Messages"],
          ["#fees", "Delivery fees"],
          ["#told", "Team"],
          /* The board draws six. Notifications is a card the board does not
             have, and it has to be reachable, so it goes after the six rather
             than in the middle of them. */
          ["#buzz", "Notifications"],
        ].map(([href, said]) => (
          <a key={href} href={href} className="pill-admin">
            {said}
          </a>
        ))}
      </nav>

      {/* The board's two columns, at its own widths: where the money arrives
          on the left at 1.35fr, and the two short cards about the site on the
          right at 1fr with their headings a size down, so the second column
          reads as the aside it is. A desk from lg, which is where the rail
          and the content both have room, rather than from xl.

          Every card is a Panel now. Each of the eighteen had written its own
          heading out at twenty six pixels, which is the desk size: on a phone
          every heading on this page was five pixels larger than the heading on
          every other admin page. */}
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <div id="pay">
            <Panel
              title="Where they pay"
              detail={
                <>
                  Every account somebody can transfer into. The first is the one the
                  order page shows and the one your WhatsApp message quotes; the
                  rest are one tap away, for anyone who banks where you do and would
                  rather send it there.
                </>
              }
            >
              <div className="space-y-3">
                {accounts === null && (
                  <p className="rounded-xl border-[1.5px] border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13px] text-brand-dark">
                    The database has no bank_accounts table yet, so this is still the
                    single account below. Run supabase/update.sql and the list starts
                    working, with that account already on it.
                  </p>
                )}

                {accounts !== null && accounts.length === 0 && (
                  <p className="rounded-xl border-[1.5px] border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13px] text-brand-dark">
                    No account on the list, so customers have nowhere to pay. Add one
                    before ordering opens.
                  </p>
                )}

                <ul className="space-y-2">
                  {(accounts ?? []).map((account, index) => (
                    <li
                      key={account.id}
                      className={`soft flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 ${
                        account.active ? "" : "bg-shell"
                      }`}
                    >
                      <span className={account.active ? "" : "text-muted"}>
                        <span className="block text-[14.5px] font-bold">
                          {account.bank_name}
                          {index === 0 && account.active && (
                            <span className="tag ml-2 bg-volt text-ink">shown first</span>
                          )}
                          {/* The board's rule is that a status is a chip and never
                              colour alone. This was a bare word in the same weight
                              as the bank's name beside it. */}
                          {!account.active && (
                            <span className="tag ml-2 bg-wash text-ink">hidden</span>
                          )}
                        </span>
                        <span className="hint block font-mono">
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
                          <ActionButton className="btn-admin btn-admin-sm" done="Done ✓">
                            {account.active ? "Hide" : "Show"}
                          </ActionButton>
                        </form>
                        <form action={deleteBankAccount}>
                          <input type="hidden" name="account_id" value={account.id} />
                          <ConfirmButton
                            tone="bad"
                            confirm={`Yes, remove ${account.bank_name}`}
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Three boxes and the button, which is the board's grid. The
                    fourth box asked for a sort number: a field nobody can
                    answer without knowing what the other accounts were given,
                    on the one card where the order is already visible as the
                    list above it. Left out, every new account lands at the
                    same hundred and sits after the ones already there, which
                    is where somebody adding one expects it. */}
                <form
                  action={addBankAccount}
                  className="grid gap-2.5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                >
                  <div>
                    <label className="label" htmlFor="bank_name">Bank</label>
                    <input
                      id="bank_name"
                      name="bank_name"
                      required
                      placeholder="GTBank"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="account_number">Number</label>
                    <input
                      id="account_number"
                      name="account_number"
                      required
                      inputMode="numeric"
                      placeholder="0123456789"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="account_name">Account name</label>
                    <input
                      id="account_name"
                      name="account_name"
                      placeholder="Sudu Delivery"
                      className="field"
                    />
                  </div>
                  <SaveButton look="btn-admin-go">Add</SaveButton>
                </form>

                <p className="hint">
                  Hiding an account takes it off the site and keeps the details.
                  Removing it is forever. Neither changes an order somebody has
                  already paid.
                </p>
              </div>
            </Panel>
          </div>

          <form id="card-pay" action={saveSettings} className="scroll-mt-4">
            <Panel
              title="Paying by card"
              detail={
                <>
                  Card payers are told to message you. You send them a link, then mark the
                  order paid on its batch page when the money lands.
                </>
              }
            >
              <div className="space-y-3">
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
                  <p className="hint mt-1">
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

                <div className="soft bg-shell p-3.5">
                  <input type="hidden" name="abroad_on__asked" value="1" />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      name="abroad_on"
                      value="on"
                      defaultChecked={settings.abroad_on === "on"}
                    />
                    Somebody abroad can pay by card
                  </label>
                  <p className="hint mt-1">
                    A parent or a sibling who cannot make a Nigerian transfer. The
                    checkout asks, under the card option, and the order says which
                    money to make the Stripe link out in. A currency with no rate
                    below is not offered at all.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="gbp_rate">
                        £1 is how many naira?
                      </label>
                      <input
                        id="gbp_rate"
                        name="gbp_rate"
                        inputMode="decimal"
                        defaultValue={settings.gbp_rate}
                        placeholder="1800"
                        className="field"
                      />
                      <p className="hint mt-1">
                        A whole number in the thousands, like 1800. Not the 0.0005
                        that a converter shows for one naira, which is the same
                        thing upside down.
                      </p>
                    </div>
                    <div>
                      <label className="label" htmlFor="usd_rate">
                        $1 is how many naira?
                      </label>
                      <input
                        id="usd_rate"
                        name="usd_rate"
                        inputMode="decimal"
                        defaultValue={settings.usd_rate}
                        placeholder="1500"
                        className="field"
                      />
                      <p className="hint mt-1">
                        Again in the thousands, like 1500.
                      </p>
                    </div>
                  </div>
                  <p className="hint mt-1">
                    Your rate, not today&apos;s market rate, and the one you are willing
                    to honour. It is only ever shown as &quot;about&quot;, and rounded up,
                    because it moves between somebody reading it and paying it.
                  </p>
                </div>

                <SaveButton look="btn-admin-go">Save</SaveButton>
              </div>
            </Panel>
          </form>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <form id="strip" action={saveSettings} className="scroll-mt-4">
            <Panel
              title="The strip along the top"
              detail={
                <>
                  One line above the header, on every page. It is the place for a
                  claim or a piece of news, so keep it to a few words: a strip that
                  shouts above every page is a strip people learn to scroll past.
                </>
              }
              size="sm"
            >
              <div className="space-y-3">
                {missing.length > 0 && (
                  <p className="rounded-xl border-[1.5px] border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13px] text-brand-dark">
                    The database is missing {missing.join(" and ")}, so there is nowhere
                    to keep this yet. Run supabase/update.sql and this box starts
                    working.
                  </p>
                )}
                {/* The strip as it will read, in the Ink the site draws it in.
                    Typed words and a code are two settings in two boxes, and the one
                    question anybody has here is what the line comes out as, which
                    until now meant saving and opening the shop to find out. Drawn
                    from what is saved, so it follows the last save rather than the
                    keystroke. */}
                {(settings.ribbon_text.trim() !== "" || settings.offer_code.trim() !== "") && (
                  <div className="flex flex-wrap items-center justify-center gap-2 rounded-[9px] bg-ink px-3 py-2.5 text-center text-[13px] text-shell">
                    {settings.offer_code.trim() !== "" && (
                      <span className="ticket bg-volt px-[7px] py-0.5 text-ink">
                        {settings.offer_code.trim().toUpperCase()}
                      </span>
                    )}
                    <span className="font-semibold">
                      {settings.ribbon_text.trim() === ""
                        ? "No words, so the strip carries the code alone"
                        : settings.ribbon_text}
                    </span>
                  </div>
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
                  <p className="hint mt-1">
                    Empty and there is no strip at all.
                  </p>
                </div>

                <div>
                  <label className="label" htmlFor="ribbon_href">Where it takes them</label>
                  <input
                    id="ribbon_href"
                    name="ribbon_href"
                    defaultValue={settings.ribbon_href}
                    maxLength={200}
                    placeholder="/collections/matriculation"
                    className="field"
                  />
                  <p className="hint mt-1">
                    Announcing something people can order is half an announcement if
                    the only way to act on it is to go and find the shelf. Leave it
                    empty for a claim like &quot;since 2018&quot;, which is not a
                    door.
                  </p>
                  <p className="hint mt-1">
                    A collection is <code>/collections/its-name</code> and an occasion
                    is <code>/occasions/its-name</code>. Point it at an occasion with
                    a time on it, like a match, and the whole strip takes itself down
                    once that time has passed: there is no box to sell by then, and a
                    banner is worse than nothing when it promises one.
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
                  <p className="hint mt-1">
                    A code from Codes. The strip reads it for what it is worth and who
                    it is for, and says nothing while it is off, expired or used up, so
                    there is nothing to remember to take down.
                  </p>
                </div>
                <SaveButton look="btn-admin-go">Save</SaveButton>
              </div>
            </Panel>
          </form>

          <form id="find-us" action={saveSettings} className="scroll-mt-4">
            <Panel
              title="Where to find us"
              detail={
                <>
                  Shown at the bottom of every page. A stranger asked to prepay ₦16,000 will
                  check that the business exists, and these are what they check.
                </>
              }
              size="sm"
            >
              <div className="space-y-3">
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
                  <label className="label" htmlFor="ios_app_id">iPhone app, App Store id</label>
                  <input
                    id="ios_app_id"
                    name="ios_app_id"
                    inputMode="numeric"
                    defaultValue={settings.ios_app_id}
                    placeholder="6813707812"
                    className="field"
                  />
                  <p className="hint mt-1">
                    The digits from the App Store address. Safari on an iPhone then
                    offers the app in a thin bar of its own, which anybody can close
                    for good, and the footer gets a link. Empty this and the site says
                    nothing about an app.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="android_package">
                    Android app, Play package name
                  </label>
                  <input
                    id="android_package"
                    name="android_package"
                    defaultValue={settings.android_package}
                    placeholder="store.sudu.app"
                    className="field"
                  />
                  <p className="hint mt-1">
                    The id from the Play address, after id=. With either of these
                    filled in, every &ldquo;get the app&rdquo; on the site points at
                    /app, which asks the phone which store it wants. Empty this and
                    the site says nothing about an Android app.
                  </p>
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
                  <p className="hint mt-1">
                    The group is the distribution. Leave blank to hide the link.
                  </p>
                </div>
                <SaveButton look="btn-admin-go">Save</SaveButton>
              </div>
            </Panel>
          </form>
        </div>
      </div>

      {/* Everything the board does not draw, which is most of the page: the
          same two columns, with the cards that hold an editor or a week of
          hours across both. They were in one grid with the four above, so the
          card the board puts top left was spanning the full width and the
          other three fell wherever the auto-placement put them. */}
      <div className="mt-[18px] grid items-start gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <form id="promoter-perk" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="What a promoter's link is worth"
            detail={
              <>
                Every promoter has a link of their own, like{" "}
                <code>sudu.store/s/ada</code>. Name a code here and anybody who
                opens one gets it applied at the checkout without typing anything,
                which is what lets them say "use my link and get ₦500 off".
              </>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="promoter_perk_code">
                  The code their link carries
                </label>
                <input
                  id="promoter_perk_code"
                  name="promoter_perk_code"
                  defaultValue={settings.promoter_perk_code}
                  placeholder="WELCOME500"
                  className="field font-mono uppercase"
                />
                <p className="hint mt-1">
                  A code from Codes, so what it is worth, whether it is a first
                  order only and how many times it can be used are all set there
                  beside every other offer. Leave it empty and a link brings the
                  promoter's name and nothing else. Only one offer applies at a
                  time: where a promotion already prices the delivery, the checkout
                  says so rather than taking money off twice.
                </p>
              </div>
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="footer" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="Footer line"
            detail={
              <>
                The line at the bottom of every page.
              </>
            }
          >
            <div className="space-y-3">
              <input name="footer_line" defaultValue={settings.footer_line} className="field" />
              <p className="hint">
                Leave it empty and the line goes. The same is true of the Instagram
                handle and the WhatsApp group link above: each is in the footer
                because it is filled in.
              </p>
              <input type="hidden" name="hide_footer__asked" value="1" />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="hide_footer"
                  value="on"
                  defaultChecked={settings.hide_footer === "on"}
                />
                Hide the whole footer
              </label>
              <p className="hint">
                The line and all three links go together. The pages keep their
                spacing, so nothing jumps.
              </p>
              <input type="hidden" name="hide_promoter_link__asked" value="1" />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="hide_promoter_link"
                  value="on"
                  defaultChecked={settings.hide_promoter_link === "on"}
                />
                Hide the Promoters link
              </label>
              <p className="hint">
                Your promoter can still sign in at /promoter. This only takes the
                link out of the footer.
              </p>
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="santa" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="Secret Santa delivery"
            detail={
              <>
                What carrying one person&apos;s gifts costs, taken out of their
                budget. Charged once against the giver, not once per thing: their
                gifts all go to one person on one day, so a chicken, a pizza and a
                bag of rice off the same list are one errand&apos;s worth of
                carrying. Past the few the first number covers, each thing is
                another bag in the boot. Zero costs nothing.
              </>
            }
          >
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="santa_delivery">
                    Carrying
                  </label>
                  <input
                    id="santa_delivery"
                    name="santa_delivery"
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={settings.santa_delivery || ""}
                    className="field"
                    placeholder="4000"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="santa_delivery_included">
                    Covers this many
                  </label>
                  <input
                    id="santa_delivery_included"
                    name="santa_delivery_included"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={settings.santa_delivery_included}
                    className="field"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="santa_delivery_extra">
                    Each one after
                  </label>
                  <input
                    id="santa_delivery_extra"
                    name="santa_delivery_extra"
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={settings.santa_delivery_extra || ""}
                    className="field"
                    placeholder="500"
                  />
                </div>
              </div>
              {settings.santa_delivery > 0 ? (
                <p className="hint">
                  So three things costs {naira(settings.santa_delivery)}, and five
                  costs{" "}
                  {naira(
                    settings.santa_delivery +
                      Math.max(0, 5 - settings.santa_delivery_included) *
                        settings.santa_delivery_extra
                  )}
                  .
                </p>
              ) : null}
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="product-notes" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="Product page notes"
            detail={
              <>
                The reassurance lines under the buy button, one per line. Write{" "}
                {"{restaurant}"} and the restaurant&apos;s name is filled in.
              </>
            }
          >
            <div className="space-y-3">
              <textarea
                name="product_notes"
                defaultValue={settings.product_notes}
                rows={4}
                className="field"
              />
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="runs-land" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="When runs land"
            detail={
              <>
                What customers are told about a new run, before you change it on
                the run itself. It is the {"{window}"} in your messages.
              </>
            }
          >
            <div className="space-y-3">
              {/* Times rather than a sentence. The words the customer reads are
                  built from these, and because they are times the shop can compare
                  them: a same day window a run already covers is left out of the
                  list instead of being guessed at from prose. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="label">Afternoon runs arrive between</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label="Afternoon runs, earliest"
                      name="window_afternoon_from"
                      defaultValue={settings.window_afternoon_from || "12:00"}
                      className="field"
                    />
                    <span className="text-sm text-muted">and</span>
                    <input
                      type="time"
                      aria-label="Afternoon runs, latest"
                      name="window_afternoon_to"
                      defaultValue={settings.window_afternoon_to || "15:00"}
                      className="field"
                    />
                  </div>
                </div>
                <div>
                  <p className="label">Night runs arrive between</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label="Night runs, earliest"
                      name="window_night_from"
                      defaultValue={settings.window_night_from || "19:00"}
                      className="field"
                    />
                    <span className="text-sm text-muted">and</span>
                    <input
                      type="time"
                      aria-label="Night runs, latest"
                      name="window_night_to"
                      defaultValue={settings.window_night_to || "21:00"}
                      className="field"
                    />
                  </div>
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
                <p className="hint mt-1">Days ahead.</p>
              </div>
              <SaveButton look="btn-admin-go">Save</SaveButton>
              <p className="hint">
                A run already created keeps the wording it was created with; change
                that one on the run itself, under Controls. Runs are created three
                weeks ahead either way, so you can plan them; the number above only
                decides how far ahead a customer is offered one.
              </p>
            </div>
          </Panel>
        </form>

        <div id="buzz" className="lg:col-span-2">
          <Panel
            title="Buzz my phone"
            detail={
              <>
                A new order, a custom order, a parcel, somebody applying to
                promote, a cart left behind and a run closing with money still
                unpaid. Each one opens the page that deals with it. Nothing a
                notification says changes anything: an order is only ever marked
                paid by you.
              </>
            }
          >
            <div className="space-y-3">
              <NotifyPhone
                phones={phones}
                publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
              />
              {!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
                <p className="ticket text-brand-dark">
                  NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not set, so
                  nothing can be subscribed yet.
                </p>
              )}
            </div>
          </Panel>
        </div>

        <form id="told" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="Who gets told"
            detail={
              <>
                Every admin who should hear when an order lands and when a cart is
                left behind. One address per line. Customers are never emailed:
                they are messaged on WhatsApp, by you.
              </>
            }
          >
            <div className="space-y-3">
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
              <div>
                <input type="hidden" name="email_asked" value="1" />
                <p className="label mb-1">What to email about</p>
                {/* One switch each, rather than the only way out being to take
                    your address off the list and lose the lot. An afternoon of
                    testing is otherwise an inbox of test orders, and a real one
                    arriving in the middle of that is one nobody sees. */}
                <div className="space-y-1">
                  {(
                    [
                      ["order", "Every new order"],
                      ["group", "A group closing"],
                      ["abandoned", "Carts left behind"],
                    ] as const
                  ).map(([kind, label]) => (
                    <label key={kind} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="email_on"
                        value={kind}
                        defaultChecked={!muted(settings.email_mute).includes(kind)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="hint mt-1">
                  Turning one off stops that email for everybody on the list above.
                  Nothing is lost: it is all still in admin.
                </p>
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
                <p className="hint mt-1">Minutes untouched.</p>
              </div>

              {/* The Google Business Profile. Two links rather than one, because
                  the one worth putting in front of somebody who has just been
                  handed their food is the one that opens the review box. */}
              <div className="space-y-3 border-t-[1.5px] border-rule pt-4">
                <div>
                  {/* A heading inside a card rather than a card of its own,
                      because this and the fields above it are one form behind
                      one save. At the size Panel gives a second column, so it
                      reads as part of the card and not as another one, and at
                      the phone size the rest of admin uses. */}
                  <h3 className="font-display text-[19px] font-black uppercase leading-none sm:text-[24px]">
                    Google
                  </h3>
                  <p className="hint">
                    The profile goes in the footer, on Contact us, and into the
                    business details search engines read. The review link is what a
                    delivered order offers and what the handover message carries.
                    Leave the review link empty and it uses the profile.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="google_profile">
                      Your Google profile
                    </label>
                    <input
                      id="google_profile"
                      name="google_profile"
                      type="url"
                      defaultValue={settings.google_profile}
                      placeholder="https://share.google/…"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="google_review">
                      Write-a-review link
                    </label>
                    <input
                      id="google_review"
                      name="google_review"
                      type="url"
                      defaultValue={settings.google_review}
                      placeholder="https://g.page/r/…/review"
                      className="field"
                    />
                  </div>
                </div>

                {/* The one third-party script on the shop, and it only loads where
                    this is filled in. Merchant Center cannot report which product
                    listings led to an order without it. */}
                <div>
                  <label className="label" htmlFor="google_tag">
                    Google tag id
                  </label>
                  <input
                    id="google_tag"
                    name="google_tag"
                    defaultValue={settings.google_tag}
                    placeholder="G-XXXXXXXXXX"
                    className="field font-mono"
                  />
                  <p className="hint mt-1">
                    From Merchant Center, under General, Key event setup. Leave this
                    empty and no Google script loads anywhere on the site, which is
                    how it shipped. Auto-tagging has to be on there as well, or
                    nothing is counted whatever is typed here.
                  </p>
                </div>

                {/* What the profile says, typed in rather than fetched. The
                    Places API charges per call and a rating that moves by a tenth
                    is not worth a request on every page view. */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="google_rating">
                      Rating out of 5
                    </label>
                    <input
                      id="google_rating"
                      name="google_rating"
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      defaultValue={settings.google_rating || ""}
                      placeholder="0"
                      className="field"
                    />
                    <p className="hint mt-1">
                      Empty or 0 and no rating is shown anywhere.
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="google_reviews">
                      How many reviews
                    </label>
                    <input
                      id="google_reviews"
                      name="google_reviews"
                      type="number"
                      min={0}
                      defaultValue={settings.google_reviews || ""}
                      placeholder="0"
                      className="field"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="hint">
                    Three reviews, copied word for word off your profile. Change
                    nothing, not even a typo. A review nobody wrote is the one thing
                    on this site worth taking the whole site down over. Leave them
                    empty and no quotes are shown.
                  </p>
                  {[0, 1, 2].map((at) => {
                    const quote = quotes[at] ?? { said: "", who: "" };
                    return (
                      <div key={at} className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                        <div>
                          <label className="label" htmlFor={`quote_said_${at}`}>
                            Review {at + 1}
                          </label>
                          <textarea
                            id={`quote_said_${at}`}
                            name={`quote_said_${at}`}
                            rows={2}
                            defaultValue={quote.said}
                            placeholder="Paste it exactly as they wrote it"
                            className="field"
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor={`quote_who_${at}`}>
                            Who said it
                          </label>
                          <input
                            id={`quote_who_${at}`}
                            name={`quote_who_${at}`}
                            defaultValue={quote.who}
                            placeholder="Temi · Pearl"
                            className="field"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The dates on the small print. Typed rather than read off the
                  file, because restyling a page is not a change to the policy and
                  a date that moves every deploy tells a reader nothing. */}
              <div className="space-y-3 border-t-[1.5px] border-rule pt-4">
                <div>
                  {/* A heading inside a card rather than a card of its own,
                      because this and the fields above it are one form behind
                      one save. At the size Panel gives a second column, so it
                      reads as part of the card and not as another one, and at
                      the phone size the rest of admin uses. */}
                  <h3 className="font-display text-[19px] font-black uppercase leading-none sm:text-[24px]">
                    The small print
                  </h3>
                  <p className="hint">
                    When each of these last said something different. Change the date
                    when you change the wording, not when the page is restyled. Empty
                    and the page carries no date at all.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["terms_updated", "Terms", settings.terms_updated],
                      ["privacy_updated", "Privacy", settings.privacy_updated],
                      ["returns_updated", "Returns", settings.returns_updated],
                    ] as const
                  ).map(([field, said, value]) => (
                    <div key={field}>
                      <label className="label" htmlFor={field}>
                        {said}
                      </label>
                      <input
                        id={field}
                        name={field}
                        type="date"
                        defaultValue={value}
                        className="field"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <div>
          <Panel
            title="Where you deliver"
            detail={
              <>
                The blocks a customer picks from at checkout. With nothing on this
                list they type their own, which is how a hostel ends up spelt four
                ways on one run sheet.
              </>
            }
          >
            <div className="space-y-3">
              <ul className="space-y-2">
                {hostels.map((hostel) => (
                  <li
                    key={hostel.id}
                    className="soft flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"
                  >
                    <span className={hostel.active ? "font-semibold" : "text-muted line-through"}>
                      {hostel.name}
                      {hostel.note && <span className="font-normal text-muted"> · {hostel.note}</span>}
                    </span>
                    <span className="flex gap-2">
                      <form action={toggleHostel}>
                        <input type="hidden" name="hostel_id" value={hostel.id} />
                        <input type="hidden" name="active" value={String(!hostel.active)} />
                        <ActionButton className="btn-admin btn-admin-sm" done="Done ✓">
                          {hostel.active ? "Hide" : "Show"}
                        </ActionButton>
                      </form>
                      <form action={deleteHostel}>
                        <input type="hidden" name="hostel_id" value={hostel.id} />
                        <ConfirmButton tone="bad" confirm={`Yes, remove ${hostel.name}`}>
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
                    className="field"
                  />
                </div>
                <div className="w-24">
                  <label className="label" htmlFor="hostel-sort">Order</label>
                  <input
                    id="hostel-sort"
                    name="sort_order"
                    inputMode="numeric"
                    placeholder="100"
                    className="field"
                  />
                </div>
                <SaveButton look="btn-admin-go" className="shrink-0">
                  Add block
                </SaveButton>
              </form>

              <p className="hint">
                Removing a block never changes an old order: every order keeps the
                block it was placed with.
              </p>
            </div>
          </Panel>
        </div>

        <form id="fees" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="What delivery costs"
            detail={
              <>
                Delivery is priced by how many containers travel, not by what the
                food costs. Set the bands here and the shop, the cart and every
                new order follow them.
              </>
            }
          >
            <div className="space-y-3">
              <BandEditor initial={parseBands(settings.fee_bands)} />
              <SaveButton look="btn-admin-go">Save prices</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="areas" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="Restaurants further out"
            detail={
              <>
                The ladders above are what Sangotedo costs, because that is the
                parade the shop was built around. A kitchen further out is the
                same order and more road, and charging the Sangotedo price for it
                is losing money on every one without noticing.
              </>
            }
          >
            <div className="space-y-3">
              <AreaEditor
                initial={parseAreas(settings.delivery_areas)}
                runBands={parseBands(settings.fee_bands)}
                sameDayBands={parseBands(settings.same_day_bands)}
              />
              <SaveButton look="btn-admin-go">Save areas</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="same-day" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="Pick a time, instead of a run"
            detail={
              <>
                A car going out for one order at a time the customer chose, rather than
                everybody sharing one. Nothing is offered sooner than three hours from
                now, because that is how long it takes to fetch and deliver, and when
                today has run out it offers tomorrow instead.
              </>
            }
          >
            <div className="space-y-3">
              <input type="hidden" name="same_day_on__asked" value="1" />
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

              <div className="border-t-[1.5px] border-rule pt-3.5">
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
              <p className="hint">
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
                <p className="hint mt-1">
                  Added to every step above. A car that cannot wait is a car doing nothing
                  else. Ordering at 9 for noon is inside the five hours; ordering at 9 for
                  three o&apos;clock is not.
                </p>
              </div>

              <SaveButton look="btn-admin-go">Save same day prices</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="week" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="Days that are different"
            detail={
              <>
                Saturday and Wednesday are not the same business. A day left alone
                follows the hours above; closing one takes it off entirely.
              </>
            }
          >
            <div className="space-y-3">
              <DayHours
                hours={HOURS}
                base={{
                  first: Number(settings.same_day_first_hour) || 12,
                  last: Number(settings.same_day_last_hour) || 18,
                }}
                saved={(() => {
                  try {
                    const raw = (settings.same_day_day_hours ?? "").trim();
                    return raw.startsWith("{") ? JSON.parse(raw) : {};
                  } catch {
                    return {};
                  }
                })()}
              />

              <SaveButton look="btn-admin-go">Save the week</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="messages" action={saveSettings} className="lg:col-span-2 scroll-mt-4">
          <Panel
            title="WhatsApp messages"
            detail={
              <>
                The words behind every template button in Orders. Edit them and the
                buttons say what you want. Leave one blank to go back to the wording
                underneath it.
              </>
            }
          >
            <div className="space-y-4">
              <div className="soft bg-shell p-3.5">
                <p className="ticket text-muted">
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

              {(
                [
                  "confirmed",
                  "payment",
                  "card",
                  "pin",
                  "ready",
                  "late",
                  "review",
                  "google",
                ] as TemplateKind[]
              ).map(
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

              <SaveButton look="btn-admin-go">Save messages</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="paid-note" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="What a paid customer reads"
            detail={
              <>
                The line on their order page once the money lands. It takes the same
                {" "}{"{hostel}"}, {"{window}"}, {"{ref}"} and {"{name}"} as the messages.
              </>
            }
          >
            <div className="space-y-3">
              <textarea
                name="paid_note"
                defaultValue={settings.paid_note || PAID_NOTE_DEFAULT}
                rows={2}
                className="field"
              />
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>

        <form id="pitch" action={saveSettings} className="scroll-mt-4">
          <Panel
            title="The line under the headline"
            detail={
              <>
                The first thing a student reads. Reword it whenever the pitch changes.
              </>
            }
          >
            <div className="space-y-3">
              <textarea
                name="pitch_line"
                defaultValue={settings.pitch_line}
                rows={2}
                className="field"
              />
              <SaveButton look="btn-admin-go">Save</SaveButton>
            </div>
          </Panel>
        </form>
      </div>
    </div>
  );
}
