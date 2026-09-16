-- A real menu has structure: a restaurant has categories, a category has items,
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
