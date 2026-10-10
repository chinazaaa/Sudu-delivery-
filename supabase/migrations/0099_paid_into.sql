-- Where the money actually landed, and how much of it.
--
-- Marking an order paid recorded that it was paid and nothing else. Three
-- accounts take transfers and some people hand over cash, so at the end of a
-- week the only way to tell which account a particular order went into was
-- to open the bank app and match amounts by eye.
--
-- The amount matters separately from the order total: a transfer comes in
-- short, or somebody rounds up, and "paid" on its own cannot say so. Zero
-- means nobody recorded a figure, which is every order marked paid before
-- this existed.
alter table orders
  add column if not exists paid_into text not null default '',
  add column if not exists paid_amount integer not null default 0;
