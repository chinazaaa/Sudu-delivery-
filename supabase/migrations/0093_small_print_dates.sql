-- When each policy was last changed.
--
-- A terms page with no date on it is a terms page nobody can tell has
-- moved, and "last updated" taken from the file's timestamp would have
-- announced a policy change every time the page was restyled. Restyling is
-- not a policy change, so the date is typed in admin by whoever actually
-- changed the policy.
--
-- Empty means no date is shown at all, which is better than a wrong one.
alter table settings
  add column if not exists terms_updated text not null default '',
  add column if not exists privacy_updated text not null default '',
  add column if not exists returns_updated text not null default '';
