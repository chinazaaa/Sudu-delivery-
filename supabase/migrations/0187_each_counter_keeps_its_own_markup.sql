-- What each counter is marked up by, so a cost can be worked out from a
-- price without assuming the whole shop does one thing.
--
-- It does not. Fifteen per cent is the rule at most counters and it holds
-- for their choices as well as their base prices, which is the useful part:
-- a large pepperoni's price is a large pepperoni's cost with fifteen on, so
-- the cost of any line is its price divided by 1.15 and there is nothing to
-- attribute between the pizza and the size.
--
-- KFC is the exception that proves it is worth storing. Its prices run from
-- 599 to 64,999, none of them fits the rule, and they are KFC's own menu
-- prices typed in off the board. A counter like that is marked up by
-- nothing, and dividing its prices by 1.15 invents a discount nobody gives.
alter table restaurants
  add column if not exists markup numeric;

comment on column restaurants.markup is
  'Per cent this counter is marked up by. Null falls back to settings.food_markup, which is what nearly every counter uses.';

-- Sold at what KFC charges, so the food earns nothing and the delivery fee
-- pays for the run. Recorded rather than inferred every time somebody looks.
update restaurants set markup = 0 where name = 'KFC';
