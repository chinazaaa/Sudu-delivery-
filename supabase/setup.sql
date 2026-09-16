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
-- has choices. A real menu has structure: a restaurant has categories, a category has items,
-- and an item has choices. A pizza is not one price, it is a size and a
-- flavour, and the counter sheet has to say which.

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

-- Supabase caches the schema; this makes the new tables visible immediately.
notify pgrst, 'reload schema';
