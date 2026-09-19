-- Delivery hours per weekday.
--
-- Saturday and Wednesday are not the same business: the shop can be out at
-- noon on a Saturday and not before three on a weekday, and one pair of hours
-- for the whole week meant picking whichever was wrong more often.
--
-- JSON, keyed by weekday as JavaScript counts them, 0 for Sunday:
--   {"0":{"first":12,"last":18},"1":{"off":true}}
-- A day that is not named falls back to the single pair above it, so a shop
-- that never touches this works exactly as it did.
alter table settings add column if not exists same_day_day_hours text not null default '';

notify pgrst, 'reload schema';
