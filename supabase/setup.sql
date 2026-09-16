-- Sudu Delivery: the whole schema in one file.
-- Paste this into the Supabase SQL editor and run it once, on a new project.
-- It is the six files in supabase/migrations run in order. Running it twice
-- will fail on the second go, because the tables already exist.

-- ============================================================
-- 0001_init.sql
-- ============================================================
-- Sudu Delivery: initial schema (see brief §13 "Data model").
-- All money is whole naira, stored as integers. No decimals, no kobo.

create extension if not exists "pgcrypto";

create table restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  closes_at   time not null,
  active      boolean not null default true,
  sort_order  int not null default 0
);

create table menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  price_food    int not null check (price_food >= 0),
  available     boolean not null default true,
  sort_order    int not null default 0
);
create index menu_items_restaurant_idx on menu_items (restaurant_id, sort_order);

create type batch_slot   as enum ('afternoon', 'night');
create type batch_status as enum ('open', 'closed', 'delivered', 'cancelled');

create table batches (
  id                    uuid primary key default gen_random_uuid(),
  run_date              date not null,
  slot                  batch_slot not null,
  cut_off_at            timestamptz not null,
  delivery_window_text  text not null default '',
  status                batch_status not null default 'open',
  capacity              int,
  unique (run_date, slot)
);
create index batches_cutoff_idx on batches (cut_off_at);

create type order_status as enum ('pending', 'paid', 'refunded', 'delivered');

create table customers (
  phone         text primary key,
  name          text not null,
  hostel        text not null default '',
  -- Written once, on the first order, and never overwritten. This single
  -- column is what makes promoter commission lifetime (brief §3a).
  promoter_code text,
  first_order_at timestamptz not null default now()
);

create table promoters (
  code    text primary key,
  name    text not null,
  phone   text not null default '',
  rate    int not null default 500,
  active  boolean not null default true
);

alter table customers
  add constraint customers_promoter_fk
  foreign key (promoter_code) references promoters(code) on delete set null;

create table orders (
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
create index orders_batch_idx on orders (batch_id);
create index orders_phone_idx on orders (customer_phone, created_at desc);
create index orders_promoter_idx on orders (promoter_code);

create table order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  menu_item_id       uuid not null references menu_items(id) on delete restrict,
  qty                int not null check (qty > 0),
  -- Copied at order time: menu prices move and old orders must not move
  -- with them (brief §13).
  unit_price_at_order int not null check (unit_price_at_order >= 0)
);
create index order_items_order_idx on order_items (order_id);

-- Every read and write goes through the service role in server code, so no
-- anon policies are defined. RLS on with no policy = the anon key sees nothing.
alter table restaurants  enable row level security;
alter table menu_items   enable row level security;
alter table batches      enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table customers    enable row level security;
alter table promoters    enable row level security;

-- ============================================================
-- 0002_seed_restaurants.sql
-- ============================================================
-- Launch restaurants (brief §4). Prices here are PLACEHOLDERS. Check them at
-- the counter on the first run and correct them in Admin → Menu, which is
-- built for exactly that.

insert into restaurants (name, address, closes_at, active, sort_order) values
  ('KFC Novare',        'Novare Mall, Sangotedo',                     '21:00', true, 1),
  ('Domino''s Pizza',   'KM 34 Lekki-Epe Expy, Emperor Estate',       '22:00', true, 2),
  -- Added once the operation is boring; off the menu until then.
  ('Panarottis',        'Shop C05, Novare Mall, Sangotedo',           '22:00', false, 3),
  ('Kilimanjaro',       'Novare Mall, Sangotedo',                     '22:00', false, 4),
  ('Burger Nation',     'Novare Mall, Sangotedo',                     '21:00', false, 5);

insert into menu_items (restaurant_id, name, price_food, sort_order)
select id, item.name, item.price, item.sort
from restaurants, (values
  ('Original Recipe 2pc + chips', 6500, 1),
  ('8pc bucket',                 18000, 2),
  ('Wrap meal',                   5500, 3),
  ('Refuel Meal',                 7000, 4),
  ('Zinger burger meal',          8000, 5)
) as item(name, price, sort)
where restaurants.name = 'KFC Novare';

insert into menu_items (restaurant_id, name, price_food, sort_order)
select id, item.name, item.price, item.sort
from restaurants, (values
  ('Medium pepperoni',           11000, 1),
  ('Medium BBQ chicken',         12000, 2),
  ('Large meat lovers',          17500, 3),
  ('Chicken wings (6)',           6500, 4),
  ('Garlic bread',                3000, 5)
) as item(name, price, sort)
where restaurants.name = 'Domino''s Pizza';

-- ============================================================
-- 0003_settings.sql
-- ============================================================
-- Payment details the admin edits from the UK, rather than environment
-- variables that need a redeploy to change.

create table settings (
  -- One row, forever. The check constraint is what keeps it that way.
  id                  boolean primary key default true check (id),
  bank_name           text not null default '',
  bank_account_name   text not null default '',
  bank_account_number text not null default '',
  -- Card payers are sent here to be handled by hand.
  whatsapp_number     text not null default '',
  card_note           text not null default
    'Paying by card? Message us on WhatsApp and we will send you a card link.',
  updated_at          timestamptz not null default now()
);

insert into settings (id) values (true);

alter table settings enable row level security;

-- ============================================================
-- 0004_bands_groups_additions.sql
-- ============================================================
-- Addendum: delivery priced by item count, group orders, and flash fee drops.

-- A flash drop rescues a thin batch. It belongs to one batch and carries the
-- reason the customer is shown, because a bare cut reads as an admission that
-- the normal fee was always too high.
alter table batches
  add column flash_fee        int,
  add column flash_fee_reason text not null default '';

-- One cart, several people's food. The group exists so the fee can be banded
-- on the combined load and split across payers.
create type group_mode as enum ('one_payer', 'split');

create table order_groups (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches(id) on delete restrict,
  leader_phone text not null,
  leader_name  text not null,
  hostel       text not null default '',
  mode         group_mode not null,
  created_at   timestamptz not null default now()
);
create index order_groups_batch_idx on order_groups (batch_id);

alter table orders
  add column group_id    uuid references order_groups(id) on delete set null,
  -- Whose food this order is, when it is one share of a split group.
  add column for_name    text,
  -- Set when a group shrinks into a cheaper band after unpaid shares are
  -- dropped. Always in the customer's favour; never a top-up demand.
  add column refund_owed int not null default 0 check (refund_owed >= 0);

create index orders_group_idx on orders (group_id);

-- Bags are labelled by name at the drop point, so each line knows who it is for.
alter table order_items add column for_name text;

alter table order_groups enable row level security;

-- ============================================================
-- 0005_social_and_pitch.sql
-- ============================================================
-- Where to find us, and the line the site opens with. Both are things that get
-- reworded often, so they belong in admin rather than in the code.

alter table settings
  add column instagram_handle    text not null default '',
  add column whatsapp_group_link text not null default '',
  add column pitch_line          text not null default
    'One price covering food and delivery, paid once, before the run. Mix restaurants in one order.';

-- ============================================================
-- 0006_pins_and_stages.sql
-- ============================================================
-- Customers get a PIN instead of an account: four digits, generated on their
-- first order, readable in admin so it can be sent on WhatsApp by hand.

alter table customers
  add column pin              text not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  add column pin_fail_count   int not null default 0,
  add column pin_locked_until timestamptz;

-- Where the run has got to. One tap per stage, shared by everyone in the batch,
-- which is the honest version of tracking: no rider app, no GPS.
create type batch_stage as enum (
  'ordering',
  'closed',
  'at_counter',
  'on_the_road',
  'at_drop',
  'handed_out'
);

alter table batches
  add column stage            batch_stage not null default 'ordering',
  add column stage_updated_at timestamptz not null default now();

