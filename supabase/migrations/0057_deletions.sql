-- What was deleted, by whom, and enough of it to put back.
--
-- An order vanished overnight and there was no way to answer the only
-- question that mattered: what happened to it. Nothing recorded a deletion,
-- so the difference between an admin pressing a button, a customer closing
-- their account, and a bug was invisible after the fact.
--
-- The whole row is kept as JSON. A deletion worth asking about is a deletion
-- worth undoing, and a list of dates with no contents would only have told us
-- that something went, which we already knew.
create table if not exists deletions (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  -- What kind of thing: 'order', 'run', 'schedule_day', 'account'.
  kind text not null,
  -- How to say it out loud: "#1019 · Byih · ₦17,650".
  label text not null default '',
  -- Who: 'admin', 'customer', 'system'. One shared password means an admin is
  -- an admin; where they were is in `detail`.
  who text not null default 'system',
  -- The address they came from, the browser, or which part of the shop did
  -- it. Whatever is true for that kind of deletion.
  detail text not null default '',
  -- Everything that went, so it can come back.
  body jsonb
);

create index if not exists deletions_at_idx on deletions (at desc);

-- Orders and runs are gone from their own tables by the time this is written,
-- so nothing here points at them.
comment on table deletions is
  'Every deliberate deletion, with the row itself, so it can be answered for and undone.';
