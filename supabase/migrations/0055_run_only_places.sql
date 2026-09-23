-- A run that is only for certain counters.
--
-- Areas already say where a car goes. This says which kitchens it stops at
-- while it is there, for the night that is a Domino's run and nothing else.
--
-- Empty means every restaurant, which is what every run is today, so nothing
-- changes until somebody ticks a box.
alter table batches
  add column if not exists only_places text not null default '';

comment on column batches.only_places is
  'Restaurants this run will fetch from, as |id|id|. Empty means all of them.';
