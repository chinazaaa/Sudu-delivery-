-- Which days the laundry car goes, and what another day costs.
--
-- The days were written into six sentences and a pair of buttons, so
-- adding a Tuesday meant a deploy and finding all seven. They are a
-- setting now: weekday numbers, Sunday is 0, so "1,4" is Monday and
-- Thursday and "1,2,4" is what next week might be.
--
-- And the same bargain the food side already offers: the shared car is
-- the cheap one, and a day of its own costs what a trip for one person
-- costs. Zero means we simply do not go on another day.
alter table settings add column if not exists laundry_days text not null default '1,4';
alter table settings add column if not exists laundry_other_day integer not null default 0;
