-- Domino's pizza prices by size.
--
-- The base price is the 12 inch Medium, and Large and Chairman are options on
-- top, because that is how the shop sells them and how the counter sheet has
-- to read: "2 x Chicken Suya (Large)".
--
-- Safe to run twice.

-- Pizza · Veggie: medium 8600, large 12810, chairman 18375
update menu_items m set price_food = 8600, available = true
from menu_categories c, restaurants r
where m.category_id = c.id and c.restaurant_id = r.id
  and r.name ilike '%domino%' and c.name = 'Pizza · Veggie';

insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Size', true, 1, 1
from menu_items m join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id
where r.name ilike '%domino%' and c.name = 'Pizza · Veggie'
  and not exists (select 1 from item_option_groups g
                  where g.menu_item_id = m.id and g.name = 'Size');

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g
     join menu_items m on m.id = g.menu_item_id
     join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id,
     (values ('Medium 12"', 0, 1),
             ('Large 14"', 4210, 2),
             ('Chairman 16"', 9775, 3)) as o(name, delta, sort)
where g.name = 'Size' and r.name ilike '%domino%' and c.name = 'Pizza · Veggie'
  and not exists (select 1 from item_options x where x.group_id = g.id);

-- Pizza · Beef: medium 8900, large 13125, chairman 17600
update menu_items m set price_food = 8900, available = true
from menu_categories c, restaurants r
where m.category_id = c.id and c.restaurant_id = r.id
  and r.name ilike '%domino%' and c.name = 'Pizza · Beef';

insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Size', true, 1, 1
from menu_items m join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id
where r.name ilike '%domino%' and c.name = 'Pizza · Beef'
  and not exists (select 1 from item_option_groups g
                  where g.menu_item_id = m.id and g.name = 'Size');

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g
     join menu_items m on m.id = g.menu_item_id
     join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id,
     (values ('Medium 12"', 0, 1),
             ('Large 14"', 4225, 2),
             ('Chairman 16"', 8700, 3)) as o(name, delta, sort)
where g.name = 'Size' and r.name ilike '%domino%' and c.name = 'Pizza · Beef'
  and not exists (select 1 from item_options x where x.group_id = g.id);

-- Pizza · Chicken: medium 9350, large 13650, chairman 19365
update menu_items m set price_food = 9350, available = true
from menu_categories c, restaurants r
where m.category_id = c.id and c.restaurant_id = r.id
  and r.name ilike '%domino%' and c.name = 'Pizza · Chicken';

insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Size', true, 1, 1
from menu_items m join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id
where r.name ilike '%domino%' and c.name = 'Pizza · Chicken'
  and not exists (select 1 from item_option_groups g
                  where g.menu_item_id = m.id and g.name = 'Size');

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g
     join menu_items m on m.id = g.menu_item_id
     join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id,
     (values ('Medium 12"', 0, 1),
             ('Large 14"', 4300, 2),
             ('Chairman 16"', 10015, 3)) as o(name, delta, sort)
where g.name = 'Size' and r.name ilike '%domino%' and c.name = 'Pizza · Chicken'
  and not exists (select 1 from item_options x where x.group_id = g.id);

-- Pizza · Loaded: medium 9800, large 15225, chairman 21525
update menu_items m set price_food = 9800, available = true
from menu_categories c, restaurants r
where m.category_id = c.id and c.restaurant_id = r.id
  and r.name ilike '%domino%' and c.name = 'Pizza · Loaded';

insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Size', true, 1, 1
from menu_items m join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id
where r.name ilike '%domino%' and c.name = 'Pizza · Loaded'
  and not exists (select 1 from item_option_groups g
                  where g.menu_item_id = m.id and g.name = 'Size');

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.delta, o.sort
from item_option_groups g
     join menu_items m on m.id = g.menu_item_id
     join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id,
     (values ('Medium 12"', 0, 1),
             ('Large 14"', 5425, 2),
             ('Chairman 16"', 11725, 3)) as o(name, delta, sort)
where g.name = 'Size' and r.name ilike '%domino%' and c.name = 'Pizza · Loaded'
  and not exists (select 1 from item_options x where x.group_id = g.id);

-- Crust is a choice with no price difference, asked on every pizza.
insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
select m.id, 'Crust', true, 1, 2
from menu_items m join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id
where r.name ilike '%domino%' and c.name like 'Pizza%'
  and not exists (select 1 from item_option_groups g
                  where g.menu_item_id = m.id and g.name = 'Crust');

insert into item_options (group_id, name, price_delta, sort_order)
select g.id, o.name, 0, o.sort
from item_option_groups g
     join menu_items m on m.id = g.menu_item_id
     join menu_categories c on c.id = m.category_id
     join restaurants r on r.id = c.restaurant_id,
     (values ('Classic Hand Tossed', 1), ('Thin Crust', 2)) as o(name, sort)
where g.name = 'Crust' and r.name ilike '%domino%' and c.name like 'Pizza%'
  and not exists (select 1 from item_options x where x.group_id = g.id);

notify pgrst, 'reload schema';
