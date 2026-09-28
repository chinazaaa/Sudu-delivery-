-- The order of the front page, as admin sets it.
--
-- The app used to hold its own opinion about which doors came first, so the
-- two drifted the moment anybody moved a card. Both read this now.
alter table settings add column if not exists home_order text not null default '';

comment on column settings.home_order is
  'The front page doors in order, one key per line, with a leading minus for a door that is switched off. Empty means the order the shop ships with.';
