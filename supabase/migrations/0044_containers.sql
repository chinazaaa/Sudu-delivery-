-- How much of the car one thing takes, as a percentage of a container.
--
-- Delivery is priced by room, and every line used to count as one: a bottle
-- of Coke was a pizza box, so four drinks moved an order up two bands. It
-- ran the other way too, a restaurant's own three-pizza deal being one line
-- and three boxes.
--
-- 100 is a normal item and is the default, so nothing prices differently
-- until somebody sets a number.
alter table menu_items
  add column if not exists container_pct int not null default 100;

-- Drinks, at a quarter each. Matched narrowly on purpose. A first attempt
-- that read the category name caught thirty-five micellar waters on the
-- skincare shelf, two fruit salads filed under "Desserts & drinks", and
-- water yam. So: food restaurants only, never the two grocery shelves,
-- a named brand or a bottle size in the name, and nothing that is plainly
-- a meal. Bottles and cans only; a milkshake is a cup and travels like one.
update menu_items m
set container_pct = 25
from restaurants r
where r.id = m.restaurant_id
  and m.container_pct = 100
  and r.kind = 'food'
  and r.slug not in ('local-market','market-square')
  and m.name ~* '\y(coca[ -]?cola|coke|pepsi|7 ?up|sprite|fanta|mirinda|teem|schweppes|monster|predator|komando|aquafina|eva|five alive|5 ?alive|chivita|hollandia|malt|nescafe|milo|mineral water|water still|water \(|water [0-9])\y'
  and m.name !~* '\y(shake|smoothie|parfait|cake|burger|meal|combo|deal|box|pizza|float|salad|fries|wings|chicken|rice|yam|leaf|pack)\y';
