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

notify pgrst, 'reload schema';
