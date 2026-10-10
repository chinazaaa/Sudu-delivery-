-- Stretches of days with no runs at all: a break, exams, travel.
--
-- A single run taken off is a `run_skips` row, one date and one slot, written
-- when an empty run is deleted. That is the wrong shape for a week away: it
-- would be ten rows typed by hand, nothing anywhere saying why, and the
-- moment a new slot joined the week the opener would fill the hole back in
-- with runs on a day nobody is here.
--
-- A closure is the whole of a date range and every slot in it, said once,
-- with a name the shop can show a customer. The opener passes over anything
-- inside one, every month that is opened leaves it alone, and the shop says
-- so on the way in rather than simply having no days to offer.
create table if not exists run_closures (
  id uuid primary key default gen_random_uuid(),
  -- What it is called, which is what a customer reads: "Mid-semester break".
  name text not null default '',
  starts_on date not null,
  -- Inclusive. A one-day closure has both the same.
  ends_on date not null,
  -- Anything extra for the shop's own eyes, never shown to a customer.
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint run_closures_order check (ends_on >= starts_on)
);

create index if not exists run_closures_dates on run_closures (starts_on, ends_on);

alter table run_closures enable row level security;
