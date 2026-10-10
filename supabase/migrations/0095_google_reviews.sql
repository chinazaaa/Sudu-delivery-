-- The rating, the count, and three reviews worth quoting.
--
-- Typed in admin rather than fetched, because Google's own terms do not let
-- a rating collected on their surface be marked up as our own structured
-- data, and because a number nobody can edit is a number that goes stale
-- the first week somebody leaves a review.
--
-- Zero on either number hides it rather than printing it: "4.8 from 0
-- reviews" is worse than saying nothing. The quotes are a JSON array of
-- { said, who }, kept as one column because they are a list rather than
-- three settings.
alter table settings
  add column if not exists google_rating numeric not null default 0,
  add column if not exists google_reviews integer not null default 0,
  add column if not exists google_quotes text not null default '';
