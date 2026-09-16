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
- Batch selector defaulting to the next open batch, with a live two-line
  countdown (this batch, then the one after it)
- Checkout on name, phone and hostel — no accounts anywhere; the phone number
  is the identity
- Order page that doubles as a **pay-by-link**: it shows the name, items and
  total, and expires at the batch cut-off, so it can be sent to a parent or
  partner to pay
- **One-tap reorder** — a phone number brings back the last order and drops it
  into the next open batch at today's prices
- **Promoter links** (`/?ref=CODE`): ₦500 off the customer's first order, and
  the code binds to their phone number permanently, so every later order pays
  the promoter without the link being used again

**Admin side** (`/admin`, one password)

- Per-batch **counter sheet** — orders collapsed by restaurant into totals,
  large enough to read one-handed in a queue, with the expected food total per
  restaurant so the right money is sent ahead of the run
- **Handout list** by student name and hostel, tickable at the drop point
  (ticks survive a refresh)
- **Unpaid orders** separated out — unpaid orders do not travel
- **Batch summary** — paid count against the 8-order minimum, gross, food cost,
  commission owed, net before fuel and driver
- Menu editor (a price changes in under a minute), promoter list with
  per-promoter order counts, and batch status/capacity controls

**Deliberately not built yet:** wallets, accounts, live tracking, ratings, a
rider app, the run pass. Payments are plain bank transfer matched by the phone
number in the narration and marked paid in admin; `payment_ref` and `paid_at`
exist from day one so a Paystack webhook can replace the manual step without a
migration.

## Running it

Requires Node 22+ and a Supabase project (free tier is enough).

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Apply the schema in the Supabase SQL editor, in order:

1. `supabase/migrations/0001_init.sql` — tables, enums, RLS on
2. `supabase/migrations/0002_seed_restaurants.sql` — KFC and Domino's, with
   **placeholder prices that must be corrected** from the counter on the first
   run (Admin → Menu)

Then, on a development project only, `supabase/fake_orders.sql` fills the next
open batch with fake orders. Use it to read the admin screen on a phone before
a single real order is taken — that screen decides whether a run goes well.

Every table read and write goes through the service role in server code, so
RLS is enabled with no anon policies. The service role key must never reach the
browser.

## Operating settings

All in `lib/config.ts`:

| Setting | Default | Note |
|---|---|---|
| `DELIVERY_FEE` | ₦4,000 | All-in, on top of food |
| `FIRST_ORDER_DISCOUNT` | ₦500 | First order only, promoter links only |
| `BATCH_MINIMUM` | 8 | Internal — never shown to customers |
| `RUN_WEEKDAYS` | `[5]` (Friday) | Batches open themselves for these days |
| `CUT_OFFS` | 11:30am / 6:00pm | Lagos time; Nigeria has no DST |

Batches for the next three weeks are created automatically on the run days
above, so nobody has to remember to open ordering.

## Honest urgency only

There is no live order counter and no invented scarcity. The countdown is a
real cut-off, "Full" appears only when a batch has a capacity set and has
reached it, and items show as unavailable only when the restaurant is actually
out. On a campus where everyone knows everyone, a number that never changes is
noticed within two runs.

## Tests

```bash
npm test        # phone identity, countdown, Lagos cut-offs, counter grouping
npm run build
```

The full customer and admin flows have been exercised end to end against a
local Postgres + PostgREST stack: promoter attribution and the first-order
discount, first-order detection across `+234`/`0` phone formats, pay-link
expiry at cut-off, roll-forward to the next batch when one closes, rejection of
orders into a closed batch, mark-paid, and the counter sheet totals.
