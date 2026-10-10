-- The shop owner's phone, so it buzzes when something needs them.
--
-- Nothing to do with push_devices. That table holds Expo tokens for customer
-- phones running the mobile app, and this holds Web Push subscriptions for
-- the one or two admin phones that have the site on their Home Screen. They
-- are different protocols, different audiences and different consequences:
-- a mistake that crossed them would send "a new order needs packing" to every
-- customer in the shop. Kept apart on purpose.
create table if not exists admin_push (
  id uuid primary key default gen_random_uuid(),
  -- What the browser hands back when permission is granted. It is a URL at
  -- Apple's or Google's push service and it is what identifies the phone, so
  -- it is the key: re-subscribing the same phone must update the row it
  -- already has rather than make a second one that sends everything twice.
  endpoint text not null unique,
  -- The two halves of the encryption the push service requires. Nothing is
  -- readable by the push service itself, which is the point of them.
  p256dh text not null,
  auth text not null,
  -- Whose phone this is, typed by whoever subscribed it. Two phones in the
  -- shop look identical in a list of endpoints, and the only reason to keep
  -- a list at all is to be able to take one off it.
  label text not null default '',
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  -- A subscription dies when the site is removed from the Home Screen or
  -- notifications are turned off, and the push service then answers 404 or
  -- 410 for ever. Marked rather than deleted on the first failure so the
  -- settings page can say why a phone went quiet.
  dead_at timestamptz,
  dead_reason text not null default ''
);

create index if not exists admin_push_live_idx
  on admin_push (created_at)
  where dead_at is null;

alter table admin_push enable row level security;

-- What has already been said, so a schedule that runs every quarter of an
-- hour does not say it again every quarter of an hour.
--
-- A table of its own rather than a column on carts or batches, because the
-- two time-based alerts hang off different things and a third will hang off
-- something else again. The key is written by the code that sends, in the
-- form "kind:id", and a row existing is the whole of the meaning: this has
-- been told, do not tell it again.
create table if not exists admin_alerts_told (
  told text primary key,
  at timestamptz not null default now()
);

alter table admin_alerts_told enable row level security;
