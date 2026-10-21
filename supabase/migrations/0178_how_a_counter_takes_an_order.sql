-- How each counter takes an order before the car gets there.
--
-- Sending the list ahead is the one change that shortens a run for
-- everybody, and the first cut of it quietly assumed every counter was on
-- WhatsApp. They are not. Some take a call, some have a number that nobody
-- watches, and some are only ever ordered at the counter.
--
-- A number on its own cannot say which, so a page holding one has to guess,
-- and a guess here sends tonight's list into a WhatsApp inbox nobody reads
-- and then waits at a counter for food that was never started.
--
-- Empty means nobody has said yet, which is honest and behaves as such: a
-- counter with a number is offered both ways until somebody says which one
-- works.
alter table restaurants
  add column if not exists orders_ahead text not null default '';

comment on column restaurants.orders_ahead is
  'How this counter takes an order ahead: whatsapp, call, no for only at the counter, or empty for nobody has said.';
