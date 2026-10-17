-- A standing order, for the one customer who has money and comes back.
--
-- A parent is not a student. They buy the same things at the same point
-- every month, they are the only people who ever find this shop through
-- Google, and until now the whole of that was a WhatsApp conversation and
-- somebody's memory. "Set up a recurring order on WhatsApp" is not a
-- subscription, it is a promise to remember.
--
-- What is kept here is only the standing instruction. Each month it raises
-- an ordinary order, so the run sheet, the counter list, the PIN, the
-- receipt and every figure on the profit page carry on knowing nothing
-- about this: a plan is a reason an order exists, never a second kind of
-- order.
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),

  -- Whoever pays, which is the parent. Their number is the one chased and
  -- the one a PIN belongs to.
  customer_name text not null default '',
  customer_phone text not null default '',

  -- Whoever eats, which is the student. The block is theirs because that
  -- is where the car goes.
  for_name text not null default '',
  for_phone text not null default '',
  hostel text not null default '',

  -- What goes in it: a box off the shelf, or last month's order copied
  -- forward. One or the other, never both.
  box_id uuid references boxes(id) on delete set null,
  from_order_id uuid references orders(id) on delete set null,

  every text not null default 'monthly',
  -- The day of the month it lands. A fixed day is the whole point: a
  -- parent who knows the food arrives on the 3rd stops wondering.
  on_day integer not null default 1,

  -- Off until somebody has agreed what it costs. A plan a parent asked for
  -- on the website is a request, not an instruction.
  active boolean not null default false,
  -- Raised without anybody pressing anything. Off by default, because a
  -- box is sourced by hand and an order nobody asked for is a bag at a
  -- block with nobody to pay for it.
  auto boolean not null default false,

  -- Campus empties out every holiday. Nothing lands while this stands.
  paused_until date,

  started_on date not null default current_date,
  -- How far the cycles have been raised, so nothing is raised twice and
  -- nothing is quietly put back after somebody deleted it on purpose.
  made_through date,

  note text not null default '',
  created_at timestamptz not null default now()
);

-- One order per plan per cycle, and the database is what says so rather
-- than the code remembering to check.
create table if not exists plan_orders (
  plan_id uuid not null references plans(id) on delete cascade,
  cycle date not null,
  order_id uuid not null references orders(id) on delete cascade,
  made_at timestamptz not null default now(),
  primary key (plan_id, cycle)
);

create index if not exists plans_due on plans (active, on_day);
create index if not exists plan_orders_order on plan_orders (order_id);

alter table plans enable row level security;
alter table plan_orders enable row level security;

-- Nothing on a plan is a customer's to read: a plan carries a parent's
-- number, their child's number and the block the child sleeps in. The
-- service key reaches it and the website's own key never does.

-- The whole thing stopped at once, for the holidays.
--
-- Campus empties out three times a year and a care package landing at an
-- empty block is a bag on a step. Per plan there is paused_until; this is
-- the one field that holds all of them, because a term ending is not news
-- about one parent.
alter table settings add column if not exists plans_paused_until text not null default '';

-- How many days before it lands the order is raised, so the parent has
-- time to pay and the shopping has time to be bought.
alter table settings add column if not exists plan_lead_days text not null default '';
