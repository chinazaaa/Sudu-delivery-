-- Money that did not come through a run.
--
-- Profit here is worked out per run: what was paid, less what the food cost,
-- less commission, less that run's fuel and driver. Every order has to sit on
-- a batch, so a job with no run had nowhere to be recorded, and the only way
-- to get it into the figures was to invent a customer, invent an order, mark
-- it paid and mark it delivered. Four lies to record one true thing, and a
-- run sheet with a bag on it that nobody is driving anywhere.
--
-- So: a line. What it was, what came in, what it cost us, on a day. Nothing
-- joins to it and nothing depends on it, which is the point.
create table if not exists other_money (
  id          uuid primary key default gen_random_uuid(),
  -- The day the work happened, not the day somebody got round to writing it
  -- down, because the figures are read by the week.
  happened_on date not null default (now() at time zone 'Africa/Lagos')::date,
  what        text not null,
  -- Who it was for, if it is worth remembering. Free text: this is not a
  -- customer record and should never grow into one.
  who         text not null default '',
  -- What they paid, and what we paid out to do it. Profit is the difference.
  took        int  not null default 0 check (took  >= 0),
  spent       int  not null default 0 check (spent >= 0),
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists other_money_day_idx on other_money (happened_on desc);

-- The line a request turned into, when it was a one-off rather than a
-- product. Most of what people ask for is bought once for one person and
-- will never be on a menu, so making a product and an order for it is two
-- wrong records to keep one right number.
alter table custom_requests
  add column if not exists money_id uuid references other_money(id) on delete set null;

-- Whose money it was, where we know. Somebody who pays for an errand is a
-- customer: they handed over money and got a thing. The phone is what ties
-- the line to their customer card, the same way an order is tied to one.
alter table other_money add column if not exists phone text not null default '';
create index if not exists other_money_phone_idx on other_money (phone) where phone <> '';

-- How many of it. She asked for one thing and bought three of them, and a
-- line saying ₦21,000 with no count does not say what was sold.
alter table other_money
  add column if not exists how_many int not null default 1 check (how_many > 0);

-- What she paid to have it brought, kept apart from what the thing cost.
-- Folded into the price it would be invisible, and the delivery is the part
-- of an errand that is actually ours: the goods are bought and sold on, the
-- trip is the work.
alter table other_money add column if not exists fee int not null default 0 check (fee >= 0);

-- What sort of cost it is: hosting, bank charges, data, transport. Without
-- it a month of outgoings is one undifferentiated list and the only question
-- worth asking of it, "what is actually eating the money", cannot be.
alter table other_money add column if not exists kind text not null default '';
create index if not exists other_money_kind_idx on other_money (kind) where kind <> '';

-- Costs that come back every month: a subscription, a bank's monthly charge.
--
-- Not every cost is one of these, so this is a list of its own rather than a
-- tick box on the ordinary form. What it holds is the standing instruction;
-- the lines it writes are ordinary other_money rows, which is what keeps the
-- profit sums from having to know this table exists.
--
-- Changing the amount changes what next month is written at and leaves
-- what has already been recorded alone, because a bill that was ₦18,000 in
-- September was ₦18,000 in September whatever it costs now.
create table if not exists standing_costs (
  id           uuid primary key default gen_random_uuid(),
  what         text not null,
  kind         text not null default '',
  amount       int  not null check (amount >= 0),
  -- Which day of the month it lands. Capped at 28 so every month has one.
  on_day       int  not null default 1 check (on_day between 1 and 28),
  active       boolean not null default true,
  from_month   date not null,
  -- The last month written, so a line somebody deleted on purpose is not
  -- quietly put back the next time the page is opened.
  made_through date,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

alter table other_money
  add column if not exists standing_id uuid references standing_costs(id) on delete set null,
  add column if not exists for_month date;

create unique index if not exists other_money_standing_month
  on other_money (standing_id, for_month)
  where standing_id is not null;
