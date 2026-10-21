-- The market shelf, filed where somebody would look.
--
-- Not trimmed. The breadth is the product on a market shelf: somebody
-- buying for egusi soup needs the egusi, the crayfish, the ugwu, the palm
-- oil and the locust beans in one place, and a shelf cut to thirty lines
-- cannot do that. What was actually wrong is that a quarter of it was
-- filed somewhere nobody would look.
--
-- Washing up liquid was under rice and pasta. Ketchup, corned beef,
-- tinned sweet corn, kidney beans, sardines and every dry seasoning were
-- under peppers and vegetables. A carton of noodles was under protein.
-- Bottled water was in two different sections, neither of them about
-- drinks.
with shop as (select id from restaurants where slug = 'local-market'),
     sections as (
       select c.id, c.name from menu_categories c, shop
       where c.restaurant_id = shop.id
     )
update menu_items i
set category_id = (select id from sections where name = v.put)
from (values
  ('Titus Sardines', 'Condiments & utensils'),
  ('Corned beef(Big)', 'Condiments & utensils'),
  ('Corned beef(small)', 'Condiments & utensils'),
  ('Heinz ketchup(Big)', 'Condiments & utensils'),
  ('Heinz ketchup(small)', 'Condiments & utensils'),
  ('Frolic ketchup', 'Condiments & utensils'),
  ('Frolic ketchup small', 'Condiments & utensils'),
  ('Sunripe red kidney beans(Big)', 'Condiments & utensils'),
  ('Sunripe Red kidney beans(small)', 'Condiments & utensils'),
  ('Green giant sweet corn(big)', 'Condiments & utensils'),
  ('Green giant sweet corn (small)', 'Condiments & utensils'),
  ('Sunripe sweet corn(big)', 'Condiments & utensils'),
  ('Sunripe sweet corn (small)', 'Condiments & utensils'),
  ('Bay leaves', 'Condiments & utensils'),
  ('Plastic curry', 'Condiments & utensils'),
  ('Plastic thyme', 'Condiments & utensils'),
  ('LARSOR fish seasoning', 'Condiments & utensils'),
  ('SONIA chilli peppe powder', 'Condiments & utensils'),
  ('Morning Fresh liquid wash 1000ml', 'Condiments & utensils'),
  ('Mama Lemon Dishwashing Liquid', 'Condiments & utensils'),
  ('Eva water', 'Condiments & utensils'),
  ('Oriental indomie 70G', 'Rice grains & pasta'),
  ('Oha leaf', 'Pepper, vegetable & fruits'),
  ('Grape ( small )', 'Pepper, vegetable & fruits')
) as v(item, put)
where i.restaurant_id = (select id from shop)
  and i.name = v.item;
