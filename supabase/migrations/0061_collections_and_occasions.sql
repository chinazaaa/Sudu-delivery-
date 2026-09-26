-- Two words, because they are two things.
--
-- These were all called occasions when the only ones were a games night and
-- a match. A care package is not an occasion and neither is a hostel
-- starter pack: they stand there all term. An occasion is a date somebody
-- is shopping for, and it goes away when the date has passed.
--
-- One table still holds both, because a box is a box either way. This says
-- which shelf a row sits on.
alter table occasions
  add column if not exists kind text not null default 'collection';

alter table occasions
  drop constraint if exists occasions_kind_check;

alter table occasions
  add constraint occasions_kind_check check (kind in ('collection', 'occasion'));

-- Anything with a clock of its own was an occasion all along.
update occasions set kind = 'occasion' where happens_at is not null;

-- The nine already live were all made when occasion was the only word there
-- was, and every one of them reads as one: a games night, a birthday, a
-- Sunday lunch. Run by hand against the live shop on the same day as this,
-- so it is written down here rather than repeated:
--   update occasions set kind = 'occasion';
-- New rows land on the collection shelf unless admin says otherwise.
