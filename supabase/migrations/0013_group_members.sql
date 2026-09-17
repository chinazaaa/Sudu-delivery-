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

notify pgrst, 'reload schema';
