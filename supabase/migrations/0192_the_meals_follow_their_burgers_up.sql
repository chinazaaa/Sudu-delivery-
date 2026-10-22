/*
 * The meals follow their burgers up.
 *
 * The board in the shop prices burgers, sides and soft serve. It does not
 * price meals, so there is nothing to read a meal cost off, and inventing
 * one from the parts would be a guess dressed up as a figure: a meal at
 * that counter has never cost the burger plus the fries plus the drink.
 *
 * What is certain is narrower and enough. Every meal cost here was worked
 * backwards off the same stale list the burgers came from, so each one is
 * wrong by exactly the amount its own burger was wrong by. Whopper cost
 * 6,859 and really costs 7,800, so the Whopper Meal is 941 light. That
 * correction carries straight through.
 *
 * So each meal rises by its burger's rise and not a naira more. The premium
 * the meal charges over its burger, whatever it is and however oddly it
 * varies between lines, is left exactly as it was, because that premium is
 * the one part of the old figure nobody has shown to be wrong.
 *
 * They stay unconfirmed. A rise worked out from a neighbouring line is a
 * better figure than the one it replaces, not a figure somebody has stood
 * in front of and checked.
 *
 * Spicy Chicken Royale is the odd one: the shop carries its meal but not
 * its burger, so there was no burger here to correct. The board puts that
 * burger 900 over the ordinary Chicken Royale, and the meal moves by the
 * same 945 the Chicken Royale line moved by, which lands it in the same
 * place from either direction.
 */
with rise(name, by) as (
  values
    ('Whopper Meal', 941),
    ('Double Whopper Meal', 2016),
    ('Steakhouse Meal', 2226),
    ('Double Steakhouse Meal', 1404),
    ('King Chicken Fillet Meal', 2650),
    ('Big King XXL Meal', 1404),
    ('Big King Meal', 945),
    ('Big King Chicken Meal', 945),
    ('Spicy Chicken Royale Meal', 945),
    ('Double Cheeseburger Meal', 851),
    ('Crispy Chicken Meal', 956),
    ('Chicken Royale Meal', 751),
    ('Whopper Junior Meal', 1465),
    ('Chicken Burger Meal', 974),
    ('Cheeseburger Meal', 970),
    ('Hamburger Meal', 974)
)
update menu_items mi
set price_cost = mi.price_cost + rise.by,
    -- Selling price rebuilt from the new cost the way the menu page builds
    -- it, so these read as prices rather than as arithmetic: cost plus the
    -- shop's fifteen per cent, rounded up to the nearest fifty.
    price_food = ceil((mi.price_cost + rise.by) * 1.15 / 50.0) * 50
from rise, restaurants r
where r.id = mi.restaurant_id
  and r.name = 'Burger King'
  and mi.name = rise.name;
