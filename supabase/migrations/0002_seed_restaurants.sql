-- Launch restaurants (brief §4). Prices here are PLACEHOLDERS — check them at
-- the counter on the first run and correct them in Admin → Menu, which is
-- built for exactly that.

insert into restaurants (name, address, closes_at, active, sort_order) values
  ('KFC Novare',        'Novare Mall, Sangotedo',                     '21:00', true, 1),
  ('Domino''s Pizza',   'KM 34 Lekki-Epe Expy, Emperor Estate',       '22:00', true, 2),
  -- Added once the operation is boring; off the menu until then.
  ('Panarottis',        'Shop C05, Novare Mall, Sangotedo',           '22:00', false, 3),
  ('Kilimanjaro',       'Novare Mall, Sangotedo',                     '22:00', false, 4),
  ('Burger Nation',     'Novare Mall, Sangotedo',                     '21:00', false, 5);

insert into menu_items (restaurant_id, name, price_food, sort_order)
select id, item.name, item.price, item.sort
from restaurants, (values
  ('Original Recipe 2pc + chips', 6500, 1),
  ('8pc bucket',                 18000, 2),
  ('Wrap meal',                   5500, 3),
  ('Refuel Meal',                 7000, 4),
  ('Zinger burger meal',          8000, 5)
) as item(name, price, sort)
where restaurants.name = 'KFC Novare';

insert into menu_items (restaurant_id, name, price_food, sort_order)
select id, item.name, item.price, item.sort
from restaurants, (values
  ('Medium pepperoni',           11000, 1),
  ('Medium BBQ chicken',         12000, 2),
  ('Large meat lovers',          17500, 3),
  ('Chicken wings (6)',           6500, 4),
  ('Garlic bread',                3000, 5)
) as item(name, price, sort)
where restaurants.name = 'Domino''s Pizza';
