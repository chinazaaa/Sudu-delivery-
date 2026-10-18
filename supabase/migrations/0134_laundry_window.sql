-- When on a collection day we come, in the shop's own words.
--
-- Not a time, a window, for the same reason a run quotes one: the driver
-- does a round of blocks and the order of them is not known until the
-- list closes. "Between 9am and 12pm" is a promise that can be kept;
-- "20 past 10" is one that cannot.
alter table settings add column if not exists laundry_window text not null default '';
-- And when it comes back, where that is a different part of the day.
alter table settings add column if not exists laundry_back text not null default '';
