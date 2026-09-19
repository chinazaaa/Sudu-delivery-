-- RUN THIS ONLY AFTER THE CODE THAT GOES WITH IT HAS DEPLOYED.
--
-- Not part of update.sql on purpose. Run early, it takes the shop down.
--
-- What it does, and why the order matters.
--
-- batches carried `unique (run_date, slot)`, which was right when every batch
-- was a run: one afternoon run a day, one night run a day. A same day car is a
-- batch too, and it borrows a run's date and slot because the enum only knows
-- those two and the real time lives on deliver_at. So a three o'clock car
-- collided with the afternoon run already going, and the second car of any
-- afternoon collided with the first. Customers were told "that batch no longer
-- exists", which was not what had happened.
--
-- Replacing that constraint with an index restricted to runs fixes it, but
-- only once nothing asks the database to infer ON CONFLICT (run_date, slot)
-- any more. Postgres cannot infer a conflict from a partial index, and the
-- upsert that opens the coming runs ran on every page load of the shop. Doing
-- this before that code shipped is what closed the shop.
--
-- So: deploy first, run this second. Both halves are safe on their own. The
-- code works with the old constraint still in place, which is why deploying
-- first is not a gap. This SQL is safe only after it.
--
-- Safe to run more than once.

-- 1. A car made while the constraint was briefly off may be sitting on a
--    run's (date, slot). Only ones with nothing in them are cleared: a car
--    with an order in it is somebody's dinner and is never deleted here.
delete from batches b
where b.kind = 'same_day'
  and not exists (select 1 from orders o where o.batch_id = b.id)
  and exists (
    select 1 from batches other
    where other.run_date = b.run_date
      and other.slot = b.slot
      and other.id <> b.id
      and other.kind <> 'same_day'
  );

-- 2. The guarantee, saying what it always meant: one RUN per slot per day.
do $one_run_per_slot$
begin
  if exists (
    select 1 from pg_constraint where conname = 'batches_run_date_slot_key'
  ) then
    alter table batches drop constraint batches_run_date_slot_key;
  end if;
end $one_run_per_slot$;

create unique index if not exists batches_one_run_per_slot_idx
  on batches (run_date, slot) where kind = 'run';

notify pgrst, 'reload schema';
