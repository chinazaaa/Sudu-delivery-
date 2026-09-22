-- Carrying a parcel, which is not food and does not ride a food run.
--
-- There is no Mainland to PAU run and there never will be, so a parcel is its
-- own trip, the way a skincare drop is: its own batch, one order on it, its
-- own day. Everything else about it is an ordinary order, so the money, the
-- PIN, the reference and the books all work without a second system.
alter table batches drop constraint if exists batches_kind_check;
alter table batches add constraint batches_kind_check
  check (kind = any (array['run', 'same_day', 'skincare', 'parcel']));

-- What is being carried, and between where. The person receiving it is the
-- gift columns from 0046: a parcel is the same shape, somebody else's name
-- and number at the far end.
alter table orders
  add column if not exists parcel_route text,
  add column if not exists parcel_item text,
  add column if not exists parcel_shop text,
  add column if not exists parcel_value int,
  add column if not exists parcel_from text,
  add column if not exists parcel_to text,
  -- The weight band it was priced in, not a weighed figure: "up to 3kg".
  add column if not exists parcel_kg int,
  -- The day the sender asked for. Not a promise: the shop agrees it, and
  -- until it does the parcel has no date at all.
  add column if not exists parcel_wanted_on date;

create index if not exists orders_parcel_idx on orders (parcel_route)
  where parcel_route is not null;

-- Off until it is set up, with nothing carried above the cap and the routes
-- and their prices written in admin rather than in code.
alter table settings
  add column if not exists parcel_on text not null default '',
  add column if not exists parcel_routes text not null default '',
  add column if not exists parcel_max_value int not null default 50000,
  add column if not exists parcel_blurb text not null default '',
  add column if not exists parcel_terms text not null default '';
