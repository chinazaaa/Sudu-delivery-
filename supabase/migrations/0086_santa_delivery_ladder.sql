-- Carrying is per person, not per thing.
--
-- One giver's gifts go to one person on one day: a chicken, a pizza and a
-- bag of rice off the same list are one errand's worth of carrying, not
-- three. So the fee is charged once against that giver, and it covers a
-- few things. Past that a thing is another bag in the boot, which costs
-- something but nowhere near a whole trip.
--
-- Three numbers because all three are arguments somebody has to be able to
-- settle later without a deploy: what the first few cost, how many that
-- covers, and what each one after it adds.
alter table settings
  add column if not exists santa_delivery_included integer not null default 3,
  add column if not exists santa_delivery_extra integer not null default 0;
