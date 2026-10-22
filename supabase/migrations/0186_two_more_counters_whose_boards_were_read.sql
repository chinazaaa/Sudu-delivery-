-- Yin Yang and Panarottis, whose menus the shop also typed in off a board.
--
-- Their prices were not imported by a migration that wrote down what it was
-- doing, so 0185 left them as guesses. The shop says both came from it the
-- same way as The Place and Pitakwa, and the arithmetic agrees: 99 of Yin
-- Yang's 103 prices and 41 of Panarottis's 46 are exactly a cost with
-- fifteen per cent on, rounded to the nearest fifty. Numbers do not line up
-- that way by accident.
--
-- Only the ones that do. The handful that miss are either a price somebody
-- changed by hand afterwards or a board that was read wrong, and either way
-- a person should look rather than a migration decide.
update menu_items mi
set cost_confirmed = true
from restaurants r
where r.id = mi.restaurant_id
  and r.name in ('Yin Yang Express', 'Panarottis')
  and mi.price_food > 0
  and mi.price_cost is not null
  and round(round(mi.price_cost * 1.15 / 50) * 50) = mi.price_food;
