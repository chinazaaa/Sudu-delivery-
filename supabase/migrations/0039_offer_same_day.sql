-- Whether an offer reaches a car somebody has to themselves.
--
-- A promotion is built for a shared run: a flat two thousand makes sense
-- across a car with ten bags in it. The same two thousand on a same day trip,
-- which goes out for one person and is priced at six and a half, is not a
-- discount, it is driving at a loss once per order.
--
-- So it is off unless somebody says otherwise, and every offer written before
-- today becomes runs only, which is what they were all meant to be.
alter table coupons add column if not exists same_day boolean not null default false;

notify pgrst, 'reload schema';
