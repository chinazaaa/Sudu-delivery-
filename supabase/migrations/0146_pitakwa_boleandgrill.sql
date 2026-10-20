-- Pitakwa Boleandgrill: the roadside grill the bole came from.
--
-- It arrived as a custom order, which is the shelf for things nobody sells.
-- Somebody does sell it, and now we know who, so it gets a counter and the
-- orders off it count towards the right name.
--
-- Prices are the grill's own board with fifteen per cent on, to the
-- nearest fifty. The container is a line of its own rather than two
-- hundred naira added to every price: the board charges for a pack, and
-- three pieces of plantain in one pack is one pack, not three.
insert into restaurants (name, address, closes_at, active, sort_order, slug, kind, area)
values ('Pitakwa Boleandgrill', 'Ajah, Lagos', time '21:00', true, 19, 'pitakwa-boleandgrill', 'food', 'ajah');

insert into menu_categories (restaurant_id, name, sort_order, aisle)
select r.id, v.name, v.sort, v.aisle
from restaurants r, (values
  ('Packs', 0, 'Meals & combos'),
  ('Singles', 1, 'Sides & snacks')
) as v(name, sort, aisle)
where r.slug = 'pitakwa-boleandgrill';

insert into menu_items (restaurant_id, category_id, name, price_food, available, sort_order, description)
select c.restaurant_id, c.id, v.name, v.price, true, v.sort, v.descr
from menu_categories c
join restaurants r on r.id = c.restaurant_id and r.slug = 'pitakwa-boleandgrill'
join (values
  ('Mini pack', 9900, 0, '1 plantain, 1 yam, 1 potato, 1 centre fish, ugba, utazi, sauce and water', 'Packs'),
  ('Beans combo', 10950, 1, 'Beans mixed with 2 plantain, 1 centre fish and water', 'Packs'),
  ('Super pack', 13550, 2, '2 plantain, 2 yam, 1 potato, 1 fish, 2 sauce, ugba or utazi, water and a Coke', 'Packs'),
  ('Signature combo', 21600, 3, '2 plantain, 1 yam, 1 potato, 2 centre fish, ugba or utazi, sauce, a plate of beans with plantain, zobo and water', 'Packs'),
  ('Belleful max', 31400, 4, '4 plantain, 2 yam, 2 potato, 3 fish, a plate of beans with plantain, 2 ugba or utazi, 3 sauce, water and zobo', 'Packs'),
  ('Exclusive', 46600, 5, '5 plantain, 3 yam, 3 potato, 3 fish, turkey or chicken, a plate of beans with plantain, 5 sauce, 2 ugba or utazi, 2 water and zobo', 'Packs'),
  ('Odogwu platter', 82250, 6, '8 plantain, 6 yam, 6 potato, 2 tail fish, 4 centre fish, 2 turkey, 2 plates of beans with plantain, 5 ugba and utazi, 7 sauce, 5 water and 2 zobo', 'Packs'),
  ('Plantain', 1950, 7, 'Roasted plantain, one piece', 'Singles'),
  ('Yam', 900, 8, 'Roasted yam, one piece', 'Singles'),
  ('Potatoes', 900, 9, '', 'Singles'),
  ('Centre fish', 4350, 10, '', 'Singles'),
  ('Tail fish', 4950, 11, '', 'Singles'),
  ('Chicken', 5200, 12, '', 'Singles'),
  ('Turkey, small', 4350, 13, '', 'Singles'),
  ('Turkey, large', 5750, 14, '', 'Singles'),
  ('Beans', 4600, 15, '', 'Singles'),
  ('Ugba', 800, 16, '', 'Singles'),
  ('Pack and sauce', 1150, 17, 'The sauce, 800, in its container, 200', 'Singles'),
  ('Extra sauce', 900, 18, 'The sauce on its own, no container', 'Singles'),
  ('Plate', 250, 19, 'The container a plate of food goes in. One per plate.', 'Singles')
) as v(name, price, sort, descr, cat) on c.name = v.cat;
