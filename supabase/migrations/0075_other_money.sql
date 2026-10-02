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
