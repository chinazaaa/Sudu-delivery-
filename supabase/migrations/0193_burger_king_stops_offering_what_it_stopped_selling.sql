/*
 * Burger King stops offering what it stopped selling.
 *
 * The menu here was imported from a delivery app's list and never pruned,
 * so it still carries a film tie-in, a suya promotion, a breakfast range
 * and two savers deals that the board in the shop has no trace of. Left
 * alone, the cost of that falls on the one person who cannot afford it:
 * somebody orders a Mandalorian Whopper, the car drives to Burger King,
 * and the counter has never heard of it. A sale missed is cheaper than a
 * trip wasted and an order that has to be unpicked at the till.
 *
 * So these go out of stock rather than being deleted. An item that is gone
 * takes its history with it, and these have history: orders, prices, the
 * cost work above. Out of stock is one tick to undo in the admin on the day
 * the suya burger comes back.
 *
 * What is NOT here is as considered as what is. The drinks stay, because
 * the photograph is of a burger board and a fridge does not appear on it;
 * absence of a Coke there says nothing about whether they sell Coke. The
 * Gourmet range stays too, because the board's own GOURMET tab is visible
 * at the edge of the photograph, cut off: that section exists and simply
 * was not in frame, which is a different thing from not being there. The
 * chicken wrap stays because it is on the board, at number seventeen.
 */
update menu_items mi
set available = false
from restaurants r
where r.id = mi.restaurant_id
  and r.name = 'Burger King'
  and mi.name in (
    -- A film promotion, years past.
    'Mandalorian Chicken Royale Meal', 'Mandalorian Whopper Meal',
    -- A seasonal suya range the board no longer carries.
    'Suya whopper', 'Suya Whopper Jr.', 'Suya Whopper Jr. Meal',
    'Suya Whopper Large', 'Suya Whopper Medium', 'Suya Whopper Regular',
    -- Deals that have run their course.
    'King Savers Deal - Chop Beta', 'King Savers Deal - Reload',
    -- Breakfast, which an evening run could not buy in any case.
    'Egg Burger', 'Egg Burger Meal', 'BBQ Egg Burger', 'BBQ Egg Burger Meal',
    'Egg and Beef Burger', 'Egg and Beef Burger Meal',
    -- Small chops and a bacon add-on, neither on the board.
    'Small Chops Lite (15pcs)', 'Small Chops Lite Meal',
    'Small Chops Regular (17pcs)', 'Small Chops Regular Meal',
    'Beef Bacon- Add-on ONLY',
    -- The energy drink tie-in, whose own combo is already gone.
    'Monster Original 440ml', 'Monster Zero Ultra 440ml'
  );
