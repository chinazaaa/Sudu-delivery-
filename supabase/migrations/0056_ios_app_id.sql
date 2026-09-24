-- The App Store id, so the shop can point at its own app.
--
-- Kept in settings rather than in the code because everything else people
-- see is, and because switching it off should not need a deploy: empty means
-- the site never mentions an app at all.
alter table settings
  add column if not exists ios_app_id text not null default '';

comment on column settings.ios_app_id is
  'Apple App Store numeric id. Empty means the site says nothing about an app.';
