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

notify pgrst, 'reload schema';
