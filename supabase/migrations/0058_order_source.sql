-- Where an order was placed: the app, or the website.
--
-- There was no way to tell, and it is the first thing anybody asks once
-- there are two front doors: is the app earning its keep, and which of them
-- does a particular customer actually use.
--
-- Empty means an order taken before this was recorded rather than a guess,
-- so nothing invents a past that was never written down.
alter table orders
  add column if not exists source text not null default '';

comment on column orders.source is
  'Where the order was placed: app, web, or empty for orders taken before this was recorded.';
