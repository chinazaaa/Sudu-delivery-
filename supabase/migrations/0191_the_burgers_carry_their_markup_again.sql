/*
 * The burgers carry their markup again.
 *
 * The migration before this one put the real board price on sixteen Burger
 * King lines and left the selling prices alone, which showed the problem
 * plainly: ten of them were being sold for less than the till charges, and
 * the other six kept between eight and two hundred and sixty naira. A
 * Whopper earned the shop eighty-eight naira a go.
 *
 * So the selling price is rebuilt from the cost, the same way the menu page
 * builds it: cost plus the shop's fifteen per cent, rounded up to the
 * nearest fifty. The figure is worked out here rather than typed in, so
 * none of the sixteen can be a slip of the hand.
 *
 * Only those sixteen move. The sides, nuggets, wings, kids meals and soft
 * serve already sat at a clean fifteen per cent over their board price and
 * have no reason to go up.
 */
update menu_items mi
set price_food = ceil(mi.price_cost * 1.15 / 50.0) * 50
from restaurants r
where r.id = mi.restaurant_id
  and r.name = 'Burger King'
  and mi.price_cost > 0
  and mi.name in (
    'Whopper', 'Double Whopper', 'Steakhouse', 'Double Steakhouse',
    'King Chicken Fillet', 'Big King XXL', 'Big King', 'Big King Chicken',
    'Double Cheeseburger', 'Crispy Chicken', 'Chicken Royale',
    'Whopper Junior', 'Chicken Burger', 'Cheeseburger', 'Hamburger',
    'Fire Up'
  );
