-- Sudu Delivery — initial schema (see brief §13 "Data model").
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
