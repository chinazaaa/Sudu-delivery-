/*
 * Burger King, read off the board in the shop.
 *
 * Every other counter so far has come out fine: taking 15 per cent back off
 * what the shop charges lands at or above what the counter actually asks
 * for, which is the whole test. Yin Yang matches its printed menu almost to
 * the naira, and Panarottis clears its board on all thirty-odd pizzas.
 *
 * Burger King is the exception, and it is not close. The prices on the shop
 * came from a list that is now below the board: a Whopper sells here for
 * 7,888 and costs 7,800 at the till, so the markup on it is eighty-eight
 * naira, and once 15 per cent is taken back off to find a cost the figure
 * lands a thousand naira under what the card is charged. Every burger on
 * the board is like that. The sides, nuggets, wings, kids meals and soft
 * serve are all fine, which is why nobody noticed: the night only loses
 * money on the part of the order that is a burger.
 *
 * So the cost becomes the board price, which is the same move the run sheet
 * makes when a driver types in what a counter really charged. The selling
 * price is left alone deliberately: what the shop charges a customer is not
 * a thing to change inside a migration, and leaving it shows the squeeze
 * honestly on the menu page rather than hiding it.
 */

-- What the board asks for, by the name the item carries here.
with board(name, counter) as (
  values
    ('Whopper', 7800),
    ('Double Whopper', 11800),
    ('Steakhouse', 10800),
    ('Double Steakhouse', 12500),
    ('King Chicken Fillet', 9500),
    ('Big King XXL', 12500),
    ('Big King', 7300),
    ('Big King Chicken', 7300),
    ('Double Cheeseburger', 6500),
    ('Crispy Chicken', 6100),
    ('Chicken Royale', 6400),
    ('Whopper Junior', 5500),
    ('Chicken Burger', 4000),
    ('Cheeseburger', 4500),
    ('Hamburger', 4000),
    ('Fire Up', 3500)
)
update menu_items mi
set price_cost = board.counter, cost_confirmed = true
from board, restaurants r
where r.id = mi.restaurant_id
  and r.name = 'Burger King'
  and mi.name = board.name;

-- The rest of the board, where the cost we already had clears it. Nothing to
-- change but the tick: somebody has now stood in front of these and checked.
update menu_items mi
set cost_confirmed = true
from restaurants r
where r.id = mi.restaurant_id
  and r.name = 'Burger King'
  and mi.name in (
    'Nuggets', 'Chicken Wings', 'Onion Rings', 'Fries', 'Plantain',
    'Yam fries', 'Sweet potato', 'King Sundae', 'King Fusion',
    'Ice Cream Cone', 'Fire Up Max', 'Side of Jollof Rice',
    'BK Jollof Kids Meal', 'Cheese - Add-on ONLY', 'Dip - Add-on ONLY',
    'Kids Meal Hamburger', 'Kids Meal Chicken Burger',
    'Kids Meal Cheeseburger', 'Kids Meal Nuggets'
  );
