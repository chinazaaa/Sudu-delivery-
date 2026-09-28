-- Where the strip at the top of the site goes when it is tapped.
--
-- It announced things nobody could reach: a banner about matriculation with
-- no way to get to the matriculation boxes is an advert for a dead end.
alter table settings add column if not exists ribbon_href text not null default '';

comment on column settings.ribbon_href is
  'Where the top strip links to. Empty leaves it as words rather than a door.';
