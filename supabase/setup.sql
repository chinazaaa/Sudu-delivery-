-- Sudu Delivery: the whole schema, safe to run more than once.
--
-- Paste this into the Supabase SQL editor and run it. It creates whatever is
-- missing and leaves whatever is already there alone, so it is also the repair
-- for a database where only some of the migrations were run.
--
-- All money is whole naira, stored as integers. No decimals, no kobo.

create extension if not exists "pgcrypto";

-- Enum types. Postgres has no "create type if not exists", hence the guards.
do $$ begin create type batch_slot as enum ('afternoon', 'night');
exception when duplicate_object then null; end $$;

do $$ begin create type batch_status as enum ('open', 'closed', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type order_status as enum ('pending', 'paid', 'refunded', 'delivered');
exception when duplicate_object then null; end $$;

do $$ begin create type group_mode as enum ('one_payer', 'split');
exception when duplicate_object then null; end $$;

-- Who picks the food up at the drop point. Paying and collecting are different
-- questions: one person can pay while four collect their own bags.
do $$ begin create type collect_mode as enum ('leader', 'each');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_method as enum ('transfer', 'card');
exception when duplicate_object then null; end $$;

do $$ begin create type batch_stage as enum (
  'ordering', 'closed', 'at_counter', 'on_the_road', 'at_drop', 'handed_out');
exception when duplicate_object then null; end $$;

create table if not exists restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  closes_at   time not null,
  active      boolean not null default true,
  sort_order  int not null default 0
);

create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  price_food    int not null check (price_food >= 0),
  available     boolean not null default true,
  sort_order    int not null default 0
);
create index if not exists menu_items_restaurant_idx on menu_items (restaurant_id, sort_order);

-- Pictures. Images are URLs so they can be pasted in from anywhere, including
-- Supabase Storage, without this app owning an upload pipeline.
alter table restaurants add column if not exists logo_url   text not null default '';
alter table restaurants add column if not exists banner_url text not null default '';
alter table restaurants add column if not exists brand_hex  text not null default '';

alter table menu_items add column if not exists image_url   text not null default '';
alter table menu_items add column if not exists description text not null default '';

create table if not exists batches (
  id                    uuid primary key default gen_random_uuid(),
  run_date              date not null,
  slot                  batch_slot not null,
  cut_off_at            timestamptz not null,
  delivery_window_text  text not null default '',
  status                batch_status not null default 'open',
  capacity              int,
  unique (run_date, slot)
);
create index if not exists batches_cutoff_idx on batches (cut_off_at);

-- A flash drop rescues a thin batch. It belongs to one batch and carries the
-- reason the customer is shown, because a bare cut reads as an admission that
-- the normal fee was always too high.
alter table batches add column if not exists flash_fee        int;
alter table batches add column if not exists flash_fee_reason text not null default '';

-- What a run actually costs to make: fuel, whoever drove, and anything else
-- bought on the night. Without these the sheet could only say what was left
-- before those, which is not profit.
alter table batches add column if not exists fuel_cost   int not null default 0;
alter table batches add column if not exists driver_cost int not null default 0;
alter table batches add column if not exists other_cost  int not null default 0;
alter table batches add column if not exists cost_note   text not null default '';

-- Where the run has got to. One tap per stage, shared by everyone in the batch,
-- which is the honest version of tracking: no rider app, no GPS.
alter table batches add column if not exists stage            batch_stage not null default 'ordering';
alter table batches add column if not exists stage_updated_at timestamptz not null default now();

create table if not exists promoters (
  code    text primary key,
  name    text not null,
  phone   text not null default '',
  rate    int not null default 500,
  active  boolean not null default true
);

create table if not exists customers (
  phone          text primary key,
  name           text not null,
  hostel         text not null default '',
  -- Written once, on the first order, and never overwritten. This single
  -- column is what makes promoter commission lifetime.
  promoter_code  text references promoters(code) on delete set null,
  first_order_at timestamptz not null default now()
);

-- Customers get a PIN instead of an account: four digits, generated on their
-- first order, readable in admin so it can be sent on WhatsApp by hand.
alter table customers add column if not exists pin              text not null default lpad((floor(random() * 10000))::int::text, 4, '0');
alter table customers add column if not exists pin_fail_count   int not null default 0;
alter table customers add column if not exists pin_locked_until timestamptz;

-- One cart, several people's food. The group exists so the fee can be banded
-- on the combined load and split across payers.
create table if not exists order_groups (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches(id) on delete restrict,
  leader_phone text not null,
  leader_name  text not null,
  hostel       text not null default '',
  mode         group_mode not null,
  created_at   timestamptz not null default now()
);
create index if not exists order_groups_batch_idx on order_groups (batch_id);
alter table order_groups add column if not exists collect_mode collect_mode not null default 'leader';

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid not null references batches(id) on delete restrict,
  customer_phone text not null,
  customer_name  text not null,
  hostel         text not null default '',
  subtotal_food  int not null check (subtotal_food >= 0),
  fee            int not null,
  discount       int not null default 0 check (discount >= 0),
  total          int not null check (total >= 0),
  payment_ref    text,
  paid_at        timestamptz,
  promoter_code  text references promoters(code) on delete set null,
  status         order_status not null default 'pending',
  created_at     timestamptz not null default now()
);
create index if not exists orders_batch_idx on orders (batch_id);
create index if not exists orders_phone_idx on orders (customer_phone, created_at desc);
create index if not exists orders_promoter_idx on orders (promoter_code);

alter table orders add column if not exists group_id    uuid references order_groups(id) on delete set null;
-- Whose food this order is, when it is one share of a split group.
alter table orders add column if not exists for_name    text;
-- Set when a group shrinks into a cheaper band after unpaid shares are
-- dropped. Always in the customer's favour; never a top-up demand.
alter table orders add column if not exists refund_owed int not null default 0 check (refund_owed >= 0);
create index if not exists orders_group_idx on orders (group_id);

-- A short number a person can say out loud. Two orders from the same customer
-- on the same run were impossible to tell apart on the run sheet.
create sequence if not exists order_no_seq start 1001;
alter table orders add column if not exists order_no bigint;
alter table orders alter column order_no set default nextval('order_no_seq');

-- Anything placed before this column existed still needs a number.
update orders set order_no = nextval('order_no_seq') where order_no is null;

create unique index if not exists orders_order_no_idx on orders (order_no);
-- The card link the admin generates by hand, kept so it can be sent again.
alter table orders add column if not exists payment_link text;

-- How the customer said they would pay, so the pay page shows the right thing
-- and admin knows who is waiting on a card link.
alter table orders add column if not exists payment_method payment_method not null default 'transfer';

create table if not exists order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  menu_item_id        uuid not null references menu_items(id) on delete restrict,
  qty                 int not null check (qty > 0),
  -- Copied at order time: menu prices move and old orders must not move
  -- with them.
  unit_price_at_order int not null check (unit_price_at_order >= 0)
);
create index if not exists order_items_order_idx on order_items (order_id);

-- Bags are labelled by name at the drop point, so each line knows who it is for.
alter table order_items add column if not exists for_name text;

-- Catalogue: a restaurant has categories, a category has items, and an item
-- has choices. A pizza is not one price, it is a size and a flavour, and the
-- counter sheet has to say which.

create table if not exists menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  sort_order    int not null default 0
);
create index if not exists menu_categories_restaurant_idx
  on menu_categories (restaurant_id, sort_order);

alter table menu_items
  add column if not exists category_id uuid references menu_categories(id) on delete set null;

-- "Size", "Flavour", "Extras". One group per question asked at the counter.
create table if not exists item_option_groups (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name         text not null,
  required     boolean not null default true,
  -- 1 asks for one choice; more than 1 allows extras to be ticked.
  max_select   int not null default 1 check (max_select >= 1),
  sort_order   int not null default 0
);
create index if not exists item_option_groups_item_idx
  on item_option_groups (menu_item_id, sort_order);

create table if not exists item_options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references item_option_groups(id) on delete cascade,
  name        text not null,
  -- Added to the item's base price. Large costs more; a flavour usually does not.
  price_delta int not null default 0,
  available   boolean not null default true,
  sort_order  int not null default 0
);
create index if not exists item_options_group_idx on item_options (group_id, sort_order);

-- What was chosen, copied at order time like the price, so a menu edit never
-- rewrites history.
create table if not exists order_item_options (
  id                   uuid primary key default gen_random_uuid(),
  order_item_id        uuid not null references order_items(id) on delete cascade,
  option_id            uuid references item_options(id) on delete set null,
  name_at_order        text not null,
  price_delta_at_order int not null default 0
);
create index if not exists order_item_options_line_idx on order_item_options (order_item_id);

alter table menu_categories     enable row level security;
alter table item_option_groups  enable row level security;
alter table item_options        enable row level security;
alter table order_item_options  enable row level security;

-- Payment details and site text the admin edits, rather than environment
-- variables that need a redeploy to change.
create table if not exists settings (
  -- One row, forever. The check constraint is what keeps it that way.
  id                  boolean primary key default true check (id),
  bank_name           text not null default '',
  bank_account_name   text not null default '',
  bank_account_number text not null default '',
  whatsapp_number     text not null default '',
  card_note           text not null default
    'Paying by card? Message us on WhatsApp and we will send you a card link.',
  updated_at          timestamptz not null default now()
);

alter table settings add column if not exists instagram_handle    text not null default '';
alter table settings add column if not exists whatsapp_group_link text not null default '';
alter table settings add column if not exists pitch_line          text not null default
  'One price covering food and delivery, paid once, before the run. Mix restaurants in one order.';

-- The reassurance lines under the buy button on a product page.
alter table settings add column if not exists product_notes text not null default
  'Collected from {restaurant}, Sangotedo, on the next run.
Delivery is charged once per order, by how many containers it is.
Wrong or missing item, refunded in full the same night.';

-- The line at the bottom of every page.
alter table settings add column if not exists footer_line text not null default
  'Sangotedo to Pan-Atlantic University. Paid orders only, refunds the same night.';

insert into settings (id) values (true) on conflict (id) do nothing;

-- Every read and write goes through the service role in server code, so no
-- anon policies are defined. RLS on with no policy = the publishable key sees
-- nothing.
alter table restaurants  enable row level security;
alter table menu_items   enable row level security;
alter table batches      enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table customers    enable row level security;
alter table promoters    enable row level security;
alter table order_groups enable row level security;
alter table settings     enable row level security;

-- Launch restaurants, only if the menu is empty. Prices are PLACEHOLDERS:
-- check them at the counter on the first run and correct them in Admin, Menu.
insert into restaurants (name, address, closes_at, active, sort_order)
select * from (values
  ('KFC Novare',      'Novare Mall, Sangotedo',               time '21:00', true,  1),
  ('Domino''s Pizza', 'KM 34 Lekki-Epe Expy, Emperor Estate', time '22:00', true,  2),
  -- Added once the operation is boring; off the menu until then.
  ('Panarottis',      'Shop C05, Novare Mall, Sangotedo',     time '22:00', false, 3),
  ('Kilimanjaro',     'Novare Mall, Sangotedo',               time '22:00', false, 4),
  ('Burger Nation',   'Novare Mall, Sangotedo',               time '21:00', false, 5)
) as seed(name, address, closes_at, active, sort_order)
where not exists (select 1 from restaurants);

insert into menu_items (restaurant_id, name, price_food, sort_order)
select r.id, item.name, item.price, item.sort
from restaurants r, (values
  ('Original Recipe 2pc + chips', 6500, 1),
  ('8pc bucket',                 18000, 2),
  ('Wrap meal',                   5500, 3),
  ('Refuel Meal',                 7000, 4),
  ('Zinger burger meal',          8000, 5)
) as item(name, price, sort)
where r.name = 'KFC Novare' and not exists (select 1 from menu_items);

insert into menu_items (restaurant_id, name, price_food, sort_order)
select r.id, item.name, item.price, item.sort
from restaurants r, (values
  ('Medium pepperoni',   11000, 1),
  ('Medium BBQ chicken', 12000, 2),
  ('Large meat lovers',  17500, 3),
  ('Chicken wings (6)',   6500, 4),
  ('Garlic bread',        3000, 5)
) as item(name, price, sort)
where r.name = 'Domino''s Pizza'
  and not exists (select 1 from menu_items m join restaurants rr on rr.id = m.restaurant_id
                  where rr.name = 'Domino''s Pizza');

-- Choices on the seeded items, so a meal that says "and a drink" actually asks
-- which drink, and a pizza asks for a size and a flavour.
insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Drink', true, 1, 1
from menu_items m join restaurants r on r.id = m.restaurant_id
where r.name = 'KFC Novare'
  and m.name in ('Original Recipe 2pc + chips', 'Wrap meal', 'Refuel Meal', 'Zinger burger meal')
  and not exists (select 1 from item_option_groups g where g.menu_item_id = m.id);

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g, (values
  ('Coke', 0, 1), ('Fanta', 0, 2), ('Sprite', 0, 3), ('Water', -300, 4)
) as o(name, delta, sort)
where g.name = 'Drink'
  and not exists (select 1 from item_options x where x.group_id = g.id);

insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Size', true, 1, 1
from menu_items m join restaurants r on r.id = m.restaurant_id
where r.name = 'Domino''s Pizza' and m.name = 'Medium pepperoni'
  and not exists (select 1 from item_option_groups g where g.menu_item_id = m.id);

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g
join menu_items m on m.id = g.menu_item_id, (values
  ('Small', -2000, 1), ('Medium', 0, 2), ('Large', 5500, 3)
) as o(name, delta, sort)
where g.name = 'Size' and m.name = 'Medium pepperoni'
  and not exists (select 1 from item_options x where x.group_id = g.id);

-- Everyone named in a group order, with the number to call when the food
-- lands. Without this a one-payer group knew the names on the bags but had no
-- way to reach the people they belong to.
create table if not exists group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references order_groups(id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  hostel     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists group_members_group_idx on group_members (group_id);
alter table group_members enable row level security;

-- Every message the admin sends, and the lines the customer reads after
-- paying, kept as editable copy rather than words baked into the code.
alter table settings add column if not exists msg_confirmed text not null default '';
alter table settings add column if not exists msg_payment   text not null default '';
alter table settings add column if not exists msg_card      text not null default '';
alter table settings add column if not exists msg_pin       text not null default '';
alter table settings add column if not exists msg_ready     text not null default '';
alter table settings add column if not exists msg_late      text not null default '';
-- What a paid customer is told on their order page.
alter table settings add column if not exists paid_note     text not null default '';

-- The delivery price list, so it can be changed without a deploy.
alter table settings add column if not exists fee_bands text not null default '';

-- The blocks food is delivered to. Typed by hand, a hostel is misspelt every
-- other order and the run sheet cannot be sorted by it.
create table if not exists hostels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  note       text not null default '',
  active     boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
alter table hostels enable row level security;

-- What the customer asked for on this order, and what the admin wants
-- remembered about it. Kept apart: one is theirs, one is yours.
alter table orders    add column if not exists customer_note text not null default '';
alter table orders    add column if not exists admin_note    text not null default '';
-- Anything worth remembering about a person across all their orders.
alter table customers add column if not exists admin_note    text not null default '';

-- A cart as it stood at checkout, kept so an order that never happened can be
-- followed up. Written only once a phone number is typed, because before that
-- there is nobody to follow up with.
create table if not exists carts (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  name          text not null default '',
  hostel        text not null default '',
  batch_id      uuid references batches(id) on delete set null,
  items         int not null default 0,
  value         int not null default 0,
  /** What was in it, as plain text, so admin can read it without a join. */
  summary       text not null default '',
  /** Set when an order from this number lands in the same run. */
  converted_at  timestamptz,
  /** Set when the admins have been told about it, so they are told once. */
  alerted_at    timestamptz,
  /** Set when the admin has dealt with it, however that went. */
  handled_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (phone, batch_id)
);
create index if not exists carts_updated_idx on carts (updated_at desc);
alter table carts enable row level security;

-- Who to email when something needs a person: one address per line.
alter table settings add column if not exists admin_emails text not null default '';
-- How long a cart sits untouched before it counts as abandoned.
alter table settings add column if not exists abandon_minutes int not null default 45;

-- Why a cart was closed, once it has been chased.
alter table carts add column if not exists handled_reason text not null default '';

-- What customers are told about when a run lands, per slot. It was fixed in
-- code, so moving the afternoon run half an hour meant a deploy.
alter table settings add column if not exists window_afternoon text not null default '';
alter table settings add column if not exists window_night     text not null default '';

-- How far ahead a customer can order.
alter table settings add column if not exists order_horizon_days int not null default 7;

-- The week's runs, as a schedule rather than a constant in the code. Each row
-- is one run on one weekday: when ordering closes, and when it lands.
create table if not exists run_schedule (
  id          uuid primary key default gen_random_uuid(),
  /** 0 = Sunday, through 6 = Saturday, as JavaScript counts them. */
  weekday     int not null check (weekday between 0 and 6),
  slot        batch_slot not null,
  /** Lagos time. Ordering closes at this time on that day. */
  cut_off     time not null,
  /** What customers are told about when it lands. */
  window_text text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (weekday, slot)
);
alter table run_schedule enable row level security;

-- Friday afternoon and Friday night, which is where the brief starts. Only
-- seeded into an empty table, so an edited schedule is never overwritten.
insert into run_schedule (weekday, slot, cut_off, window_text)
select * from (values
  (5, 'afternoon'::batch_slot, time '11:30', 'On campus ~2:00pm'),
  (5, 'night'::batch_slot,     time '18:00', 'On campus ~8:30pm')
) as seed(weekday, slot, cut_off, window_text)
where not exists (select 1 from run_schedule);

-- Somewhere to keep the photographs, readable by anyone since they are the
-- pictures on a public menu.
insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do update set public = true;

-- Uploads come from the server with the service role, which bypasses these,
-- but the files still have to be readable by a browser.
do $$ begin
  -- Skipped when it already exists: creating it blindly can deadlock against
  -- whatever else is reading storage.objects in the same session.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'menu images are public'
  ) then
    create policy "menu images are public" on storage.objects
      for select using (bucket_id = 'menu');
  end if;
exception when duplicate_object then null; end $$;

-- Supabase caches the schema; this makes the new tables visible immediately.
notify pgrst, 'reload schema';
