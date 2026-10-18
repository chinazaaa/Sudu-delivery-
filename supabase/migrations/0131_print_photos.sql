-- A photograph per printing service, ours rather than the supplier's.
--
-- The catalogue itself is in the code: names and descriptions, no prices
-- and no pictures, because the supplier's photographs are theirs. This is
-- where ours go as they are taken, keyed by the item's slug, so a shelf of
-- two hundred can fill up one picture at a time rather than all at once.
create table if not exists print_photos (
  slug text primary key,
  url text not null default '',
  updated_at timestamptz not null default now()
);
