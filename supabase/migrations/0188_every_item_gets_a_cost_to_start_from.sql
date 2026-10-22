-- A cost on everything, so there is a figure to check rather than a blank.
--
-- Each counter's own markup, not one number across the shop. Nearly every
-- counter is fifteen per cent and its cost is its price divided by 1.15,
-- which is what the website shows plus fifteen, read backwards.
--
-- KFC is the exception and keeps it. Its markup is recorded as nothing,
-- because its prices are KFC's own board typed in: 599 and 64,999 are not
-- figures that come out of a sum. So its cost is its price, which says the
-- true thing, that the food earns the shop nothing and the delivery fee
-- pays for the run. Dividing those by 1.15 would invent a discount KFC
-- does not give and would quietly report profit that was never made.
--
-- All of it is a starting point rather than an answer, which is what the
-- checked tick is for. The shop's plan is to go counter by counter and
-- make sure its cost is never lower than what the counter really charges,
-- and a wrong figure somebody can see is what makes that possible.
update menu_items mi
set price_cost = greatest(
      0,
      round(mi.price_food / (1 + coalesce(r.markup, (select food_markup from settings limit 1), 15) / 100))
    )
from restaurants r
where r.id = mi.restaurant_id
  and mi.price_food > 0
  and mi.price_cost is null;
