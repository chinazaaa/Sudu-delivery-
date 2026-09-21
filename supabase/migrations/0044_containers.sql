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

-- Drinks, at a quarter each. Found by category where there is one, and by
-- name where the drinks live inside a general category, which is how KFC's
-- arrived. Bottles and cans only: a milkshake is a cup and travels like one.
update menu_items m
set container_pct = 25
where m.container_pct = 100
  and (
    exists (
      select 1 from menu_categories c
      where c.id = m.category_id and c.name ilike '%drink%'
    )
    or m.name ~* '\y(coca[ -]?cola|coke|pepsi|7 ?up|sprite|fanta|mirinda|teem|schweppes|monster|predator|komando|aquafina|eva water|water|5 ?alive|five alive|chivita|hollandia|malt|amstel|nescafe|milo)\y'
  )
  and m.name !~* '\y(shake|smoothie|parfait|cake|burger|meal|combo|deal|box|pizza|float)\y';
