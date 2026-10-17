-- The drawing a counter wears until it has a photograph.
--
-- It was guessed off the name, which works for Dodo Pizza and Krispy Kreme
-- and not at all for the ones whose names are people: "Uncle Stan's" is
-- small chops to everybody at PAU and nothing to a regular expression, so
-- it wore a slice of cake off the spare rotation.
--
-- Empty means guess, which stays right for most of them.
alter table restaurants add column if not exists drawing text not null default '';
