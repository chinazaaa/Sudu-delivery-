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
-- Nothing here deletes a single row. An earlier version tried to tidy away
-- stray same day cars and was refused, rightly: order_groups points at a batch
-- with ON DELETE RESTRICT, so a car somebody's group is sitting in cannot be
-- removed from under them. It never needed removing. The index below covers
-- runs only, so a same day car sharing a date and slot with one is not a
-- clash, and two same day cars on the same afternoon are exactly what this is
-- for.
--
-- Safe to run more than once.

-- Say plainly if two runs really do share a day and slot, rather than failing
-- on an index error nobody can read. This should never be true, but a script
-- that runs against a live shop should say what it found.
do $runs_are_unique$
declare clashes int;
begin
  select count(*) into clashes from (
    select run_date, slot from batches
    where coalesce(kind, 'run') = 'run'
    group by run_date, slot having count(*) > 1
  ) dupes;

  if clashes > 0 then
    raise exception
      'Stopping: % day and slot pairs have more than one RUN in them. Nothing has been changed. Send this message on.', clashes;
  end if;
end $runs_are_unique$;

-- The guarantee, saying what it always meant: one RUN per slot per day.
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
