-- The laundry service.
--
-- The price list itself lives in the code, as cost, and is never printed:
-- what a customer sees is that cost plus the markup below. So the one place
-- the shop's margin lives is a field somebody can change without a deploy,
-- and there is no way for a page to publish what we pay the cleaner.
--
-- A minimum rather than a delivery fee, because collection and return are
-- two trips and a flat fee on top of a four hundred naira blouse reads as a
-- shop that does not want the work.
alter table settings add column if not exists laundry_on text not null default '';
alter table settings add column if not exists laundry_markup integer not null default 0;
alter table settings add column if not exists laundry_minimum integer not null default 0;
alter table settings add column if not exists laundry_note text not null default '';
