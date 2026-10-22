-- Sharpening the costs where the rule is written down, and taking them off
-- where they were never anything.
--
-- 0184 gave every item a cost by dividing the menu price by 1.15. That was
-- arithmetic across the whole menu, and the menu is not one thing.
--
-- Two counters have the rule in writing. The Place and Pitakwa were both
-- imported as "the counter's own board with fifteen per cent on, to the
-- nearest fifty", so their costs are not a guess: somebody read a board.
-- Dividing by 1.15 lands a few naira off because of that rounding, so the
-- cost is snapped back to the fifty it came from, and only where the sum
-- round trips: cost, plus fifteen per cent, rounded, is the price on the
-- menu again. 71 of The Place's 78 and 19 of Pitakwa's 20 do.
update menu_items mi
set price_cost = round(round(mi.price_food / 1.15 / 50) * 50)
from restaurants r
where r.id = mi.restaurant_id
  and mi.price_food > 0
  and round(round(round(mi.price_food / 1.15 / 50) * 50 * 1.15 / 50) * 50) = mi.price_food;

update menu_items mi
set cost_confirmed = true
from restaurants r
where r.id = mi.restaurant_id
  and r.name in ('The Place', 'Pitakwa Boleandgrill')
  and mi.price_food > 0
  and round(round(mi.price_cost * 1.15 / 50) * 50) = mi.price_food;

-- And KFC, where the cost was never derived from anything.
--
-- Not one of its 52 prices fits the fifteen per cent rule, which is not a
-- near miss: they run from 599 to 64,999. Prices ending in nine do not come
-- out of a sum that rounds to fifty. They are KFC's own menu prices, typed
-- in as they are on the board.
--
-- So the cost sitting against them is a division that meant nothing, and a
-- cost that means nothing is worse than none: it makes a margin that looks
-- checked. They go back to empty, which says the true thing, which is that
-- nobody has told the shop what KFC charges it.
--
-- Worth somebody looking at rather than only correcting. If the shop is
-- selling KFC at KFC's own price, the food earns nothing and the whole run
-- is paid for by the delivery fee, and that is a decision rather than a
-- data problem.
update menu_items mi
set price_cost = null, cost_confirmed = false
from restaurants r
where r.id = mi.restaurant_id and r.name = 'KFC';
