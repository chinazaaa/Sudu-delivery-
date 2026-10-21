-- A season the whole site can wear, and take off in one tap.
--
-- Empty is the shop as it always looks. A word in here dresses the front
-- page for something that is on, and clearing it undresses it: no deploy,
-- no leftover pumpkins in November, and nothing to remember to undo on a
-- Sunday morning.
--
-- Deliberately one column of free text rather than a tick box per holiday.
-- Christmas and matriculation want the same mechanism and none of them
-- wants a new column, and a season nobody has written styling for simply
-- shows the ordinary shop.
alter table settings
  add column if not exists season text not null default '';

comment on column settings.season is
  'Which season the site is dressed for: empty for none, or a word with styling behind it such as halloween.';
