# Sudu Delivery

Batched food delivery from Sangotedo to Pan-Atlantic University. Students order
from KFC and Domino's, orders are batched into a run, one driver collects them
physically and hands them out at a fixed campus drop point. One price covers
food and delivery, paid in advance.

This repo is the smallest thing that removes the WhatsApp mess: a menu, a cart,
a batch cut-off, and the admin screen the driver reads at the counter.

## What is built

**Customer side**

- Menu across multiple restaurants, with items mixable in one cart and one fee
- **Delivery priced by container count, not food value.** 1-3 items ₦4,000,
  4-6 ₦6,000, 7-10 ₦8,000, 11+ ₦10,000. One ₦24,000 bucket is one container
  and pays the headline ₦4,000. The cart shows the count, the fee and how far
  the next band is
- **Group orders.** One cart for several people, each item tagged with a name
  so bags are labelled at the drop point. Either the leader pays for everything
  (default) or each person gets their own payment link. No group discount: the
  bands already price a bigger load correctly
- **Adding to an order** later in the week: same phone, same batch, merged
  into one bag, charged only the difference in delivery if the extra items push
  into a bigger band
- Batch selector defaulting to the next open batch, with a live two-line
  countdown (this batch, then the one after it)
- Checkout on name, phone and hostel. No accounts anywhere: the phone number
  is the identity
- Order page that doubles as a **pay-by-link**: it shows the name, items and
  total, and expires at the batch cut-off, so it can be sent to a parent or
  partner to pay
- **My orders**: a phone number plus a four digit PIN shows every order placed,
  with status and pay links. No signup and no password to reset. The PIN is
  generated on the first order and you send it on WhatsApp
- **Where your food is**: a shared batch stage (closed, at the counter, on the
  road, at the drop point, handed out) on every paid order. No rider app and no
  GPS, so there is nothing to break on the road
- **One-tap reorder.** A phone number brings back the last order and drops it
  into the next open batch at today's prices
- **Promoter links** (`/?ref=CODE`): ₦500 off the customer's first order, and
  the code binds to their phone number permanently, so every later order pays
  the promoter without the link being used again

**Admin side** (`/admin`, one password)

- **Flash fee drop** per batch with the reason the customer is shown, for
  rescuing a thin batch. Every band moves down together, so "₦2,000 delivery
  tonight" is true while a car-load still pays for a car-load
- **Refunds owed.** When unpaid shares drop out of a group at the cut-off and
  the order falls into a cheaper band, the difference is recalculated in the
  customer's favour and listed to be paid back
- Per-batch **counter sheet**: orders collapsed by restaurant into totals,
  large enough to read one-handed in a queue, with the expected food total per
  restaurant so the right money is sent ahead of the run
- **Handout list** by student name and hostel, tickable at the drop point
  (ticks survive a refresh)
- **Unpaid orders** separated out, because unpaid orders do not travel
- **Batch summary**: paid count against the 8-order minimum, gross, food cost,
  commission owed, net before fuel and driver
- Menu editor (a price changes in under a minute), promoter list with
  per-promoter order counts, and batch status/capacity controls
- **Stage buttons**: one tap per stage of the run, seen by everyone in the batch
- **WhatsApp templates**: every order has a click to send message, pre-filled
  with the confirmation or the transfer details, the order link, and the
  customer's PIN. Nothing is sent automatically and there is no SMS bill
- **Take the run with you**: the whole sheet (counter list, handout list, unpaid
  names, totals) sent to your own WhatsApp as text, so it still opens at the
  gate with no signal
- **Settings**: bank details, the WhatsApp number card payers are sent to, the
  Instagram handle and PAU group link shown in the footer, and the line the
  home page opens with. Each section saves on its own, so editing one never
  blanks another

**Payment** is bank transfer, plus a by-hand route for card payers. There is no
Paystack or Flutterwave and nothing automated:

- The bank details and the WhatsApp number live in **Admin, Settings**, so they
  change from a phone in seconds with no redeploy
- The customer transfers and puts their phone number in the narration, which is
  how the payment is matched to the order
- Anyone who would rather pay by card taps **Message us on WhatsApp**. The
  message arrives pre-filled with their name, batch, total and order reference,
  you send them a link, and you mark the order paid on its batch page once you
  see the money
- The order page is itself the shareable link: send it to a parent or partner
  and they see the items, the total and the same bank details

PINs are stored as plain four digit numbers, because you have to be able to
read one off the admin screen and send it. They guard order history and nothing
else: no money moves and no details change behind them. Five wrong tries lock a
number for fifteen minutes.

**Deliberately not built:** wallets, passworded accounts, live GPS tracking,
ratings, a rider app, the run pass. `payment_ref` and `paid_at` exist on every order from day
one, so if a gateway is ever wanted it slots in without a migration.

## Running it

Requires Node 22+ and a Supabase project (free tier is enough).

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Apply the schema in the Supabase SQL editor, in order:

1. `supabase/migrations/0001_init.sql`: tables, enums, RLS on
2. `supabase/migrations/0002_seed_restaurants.sql`: KFC and Domino's, with
   **placeholder prices that must be corrected** from the counter on the first
   run (Admin → Menu)
3. `supabase/migrations/0003_settings.sql`: the one settings row holding the
   bank details and WhatsApp number
4. `supabase/migrations/0004_bands_groups_additions.sql`: flash fees, group
   orders and per-item name tags
5. `supabase/migrations/0005_social_and_pitch.sql`: handles and the home page
   pitch line
6. `supabase/migrations/0006_pins_and_stages.sql`: customer PINs and run stages

Then fill in **Admin, Settings** before ordering opens. Until the bank details
are set, the pay page says so rather than showing a blank account number.

Then, on a development project only, `supabase/fake_orders.sql` fills the next
open batch with fake orders. Use it to read the admin screen on a phone before
a single real order is taken. That screen decides whether a run goes well.

Every table read and write goes through the service role in server code, so
RLS is enabled with no anon policies. The service role key must never reach the
browser.

## Deploying to Vercel

Three environment variables, set for Production, Preview and Development:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings, API, Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, same page, the `service_role` secret |
| `ADMIN_PASSWORD` | Anything you choose, long and random |

Nothing else belongs in the environment. Bank details, the WhatsApp number,
the Instagram handle, the group link and the home page line are all rows in
the database, edited in Admin, Settings.

Two things worth knowing about `ADMIN_PASSWORD`. It is the only admin
credential, so treat it as the key to the whole run sheet. It also signs the
admin cookie and the customer order history cookie, so changing it signs
everyone out, which is exactly what you want if it ever leaks.

The `service_role` key bypasses every row level security rule in the database.
It is only ever read in server code, never sent to the browser, and it must not
be given a `NEXT_PUBLIC_` prefix.

Then point `sudu.ng` at the Vercel project, so students never see a
`vercel.app` link.

## Operating settings

All in `lib/config.ts`:

| Setting | Default | Note |
|---|---|---|
| `FEE_BANDS` (`lib/fees.ts`) | 4k / 6k / 8k / 10k | By item count. **Provisional: set the thresholds from what the boot actually holds** |
| `FIRST_ORDER_DISCOUNT` | ₦500 | First order only, promoter links only |
| `BATCH_MINIMUM` | 8 | Internal, never shown to customers |
| `RUN_WEEKDAYS` | `[5]` (Friday) | Batches open themselves for these days |
| `CUT_OFFS` | 11:30am / 6:00pm | Lagos time; Nigeria has no DST |

Batches for the next three weeks are created automatically on the run days
above, so nobody has to remember to open ordering.

## Honest urgency only

There is no live order counter and no invented scarcity. The countdown is a
real cut-off, "Full" appears only when a batch has a capacity set and has
reached it, and items show as unavailable only when the restaurant is actually
out. A batch that has just closed is shown struck through with the next one
selected, so a late arrival sees what they missed rather than the list quietly
changing. On a campus where everyone knows everyone, a number that never
changes is noticed within two runs.

## Tests

```bash
npm test        # phone identity, countdown, Lagos cut-offs, counter grouping
npm run build
```

The full customer and admin flows have been exercised end to end against a
local Postgres + PostgREST stack: the fee bands stepping at 4, 7 and 11 items,
a single expensive bucket still paying ₦4,000, a split group order settling its
band when an unpaid share dropped at the cut-off (₦167 refunds recorded for the
two who paid), an addition merging into one bag and charging only the ₦2,000
difference, a flash drop showing ₦2,000 entry while eleven items still paid
₦8,000, a closed batch shown unavailable with the next one selected, a cart
mixing KFC and Domino's on one fee,
promoter attribution and the first-order discount, first-order detection across
`+234`/`0` phone formats, admin-edited bank details and the WhatsApp card
route appearing on the pay page, the pay link opened by someone other than the
customer, pay-link expiry at cut-off, roll-forward to the next batch when one
closes, rejection of orders into a closed batch, mark-paid, and the counter
sheet totals.
