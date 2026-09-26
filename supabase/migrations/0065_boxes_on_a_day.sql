-- A box does not have to ride a run.
--
-- A care package is sourced, packed and then delivered, which is nothing
-- like a pizza. So a collection can be asked for on a day of its own: the
-- customer picks a date, or says any day is fine and we agree one with them.
-- Either way it gets a trip of its own rather than joining the food run,
-- and it never shows up in the list a hungry person picks from, because
-- openBatches only ever asks for runs.
alter table batches drop constraint if exists batches_kind_check;

alter table batches
  add constraint batches_kind_check
  check (kind in ('run', 'same_day', 'skincare', 'parcel', 'box'));

-- The day they asked for. Null on a box means they said any day is fine and
-- somebody has still to agree one with them, which their own page says
-- rather than showing a date nobody has promised.
alter table orders
  add column if not exists wanted_on date;

-- "Send this again every month." Not a subscription: nothing charges itself.
-- It is a note on the order that admin acts on, and a button that makes the
-- next one from what this one finally became, not from what was first
-- ordered.
alter table orders
  add column if not exists repeat_every text not null default '';

alter table orders
  drop constraint if exists orders_repeat_every_check;

alter table orders
  add constraint orders_repeat_every_check
  check (repeat_every in ('', 'weekly', 'fortnightly', 'monthly'));

-- In their words: "every last Saturday", "the 1st", "after payday".
alter table orders
  add column if not exists repeat_note text not null default '';
