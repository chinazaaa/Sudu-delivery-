-- Market Square Novare, the whole menu.
--
-- Built from the price list you exported: 142 products across eight
-- sections, from 143 rows. Nothing of this menu existed before, so
-- everything here is new.
--
-- THE MSQ PREFIX IS GONE AND THE SHOUTING WITH IT. The till writes MSQ BAKED
-- CHIN-CHIN 500G. On the menu, under Market Square, that reads as Baked
-- Chin-chin 500g. Nothing else about the name is changed.
--
-- Every description in the export repeats the product name, so none is
-- carried over. The names stand on their own.
--
-- TEA CAKE (BIG) AND TEA CAKE BIG ARE THE SAME PRODUCT, listed twice at
-- 2,200 and 2,310. The dearer is used, as with every other two-price row.
--
-- The export gives no sections, so these are worked out from the names. Move
-- anything filed oddly in Admin, Menu.
--
-- 19 products the export marks out of stock go in switched off.
--
-- Safe to run twice.

drop table if exists msq_import;
create table msq_import (
  category  text    not null,
  name      text    not null,
  price     int     not null,
  available boolean not null,
  sort      int     not null
);

insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Beef Rice Special', 3850, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Grecian Rice', 3150, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Fried Rice', 3150, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Rice & Beans', 1680, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Banga Rice', 3150, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Macaroni Special', 3850, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Coconut Rice', 3640, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Chinese Fried Rice', 4200, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Plantain Porridge', 5500, true, 9);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'White Rice and Stew', 1820, true, 10);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Chicken Pasta', 3640, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Oriental Rice', 3150, true, 12);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Jollof Rice', 3150, true, 13);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Poridge Yam', 2800, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Ofada Rice and Sauce', 0, false, 15);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Yam Pottage', 1550, true, 16);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Asun Rice', 0, false, 17);
insert into msq_import (category, name, price, available, sort) values ('Rice & mains', 'Ofada Rice', 2520, true, 18);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Okro Soup', 4200, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Oha Soup', 5250, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Edikaikong', 4340, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Catfish Pepper Soup', 3800, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Eba', 450, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Ofada Sauce', 8050, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Okazi Soup', 6300, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Semovita', 550, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Native Soup', 0, false, 9);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Bitter Leaf Soup', 0, false, 10);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Goat Meat White Soup', 10000, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Egusi Soup', 0, false, 12);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Leaf Moimoi', 0, false, 13);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Wheat', 500, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Soups & swallow', 'Pounded Yam', 0, false, 15);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Egg Sauce', 2000, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Beef Kebab', 2250, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Boiled Egg', 400, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Goat Meat Pepper Sauce', 2500, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Breaded Kote Fish', 1850, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Pepper Chicken', 2800, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Fried Chicken', 1800, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Peppered Turkey', 8000, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Stewed Cow Head', 3700, true, 9);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Chicken Curry Sauce', 6650, true, 10);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Stewed Beef', 1800, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Gizzard Kebab', 2500, true, 12);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Stewed Goat Meat', 2500, true, 13);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Chicken Salad', 1000, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Stewed Gizzard', 15000, true, 15);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Chicken Mayo', 1000, true, 16);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Chicken Kebab', 2800, true, 17);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Crispy Chicken', 2000, true, 18);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Chicken Burger', 2250, true, 19);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Beef Burger', 0, false, 20);
insert into msq_import (category, name, price, available, sort) values ('Meat & fish', 'Scotch Egg', 0, false, 21);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Beans', 2940, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Fried Plantain', 850, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Stew', 2800, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Vegetable Salad', 1000, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Chips', 6540, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Fried Yam and Sauce', 0, false, 6);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'White Yam', 1550, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Sides & salads', 'Coleslaw', 850, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Peanut Roll/bread', 800, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Sardine Bread', 1750, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Milk Bread', 1850, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Chicken Bread', 900, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Fruit Bread', 1850, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Wheat Bread', 1100, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Health Bread', 3500, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Burger Buns Bread', 1150, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Sweet Bread (Fantasia)', 2000, true, 9);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Family Loaf', 1700, true, 10);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Custard Buns', 500, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Plain Baguette - Small (300g)', 650, true, 12);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Plain Baguette - Large (400g)', 1000, true, 13);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Seeded Baguette - Small (300g)', 1000, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Oat Bread', 0, false, 15);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Seeded Baguette - Large (400g)', 1500, true, 16);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Rock Buns', 0, false, 17);
insert into msq_import (category, name, price, available, sort) values ('Bread', 'Chelsea Buns', 0, false, 18);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Sponge Cake (Whole)', 13500, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Tea Cake (Big)', 2310, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Celebration Cake 6"', 9500, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Apple Cake', 2250, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Sliced Cake', 1050, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Cake Bread', 550, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Celebration Cake 8', 14000, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Celebration Cake 10', 20500, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Iced Cupcake', 700, true, 9);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Mighty Nice', 1500, true, 10);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Copenhagen', 500, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Tea Cake (Small)', 1210, true, 12);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Malderia Pack', 400, true, 13);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Muffin Cake', 1950, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Celebration Cake 12', 24600, true, 15);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Fruit Cake 8', 6000, true, 16);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Madeira Fruit Cake', 3600, true, 17);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Queen''s Cakes', 500, true, 18);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Madeira Cake', 3400, true, 19);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Cup Cake', 600, true, 20);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Fruit Queen Cake', 500, true, 21);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Ice Cup Cake (6 Pack)', 1950, true, 22);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Celebration Cake 14"', 0, false, 23);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Chocolate Sponge 3 Inches', 14000, true, 24);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Plain Sponge 8 Inches', 13500, true, 25);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Plain Sponge 3 Inches', 10700, true, 26);
insert into msq_import (category, name, price, available, sort) values ('Cakes', 'Chocolate Sponge 8 Inches', 18000, true, 27);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Ring Donut', 700, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Cookies (Single)', 450, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Roll', 850, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Fish Pie', 900, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Meat Pie', 1000, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Puff Puff', 150, true, 6);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Coconut Roll', 800, true, 7);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Scones', 350, true, 8);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Chicken Pie', 1000, true, 9);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Baked Chin-chin 500g', 2800, true, 10);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Egg Roll', 700, true, 11);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Super Roll', 1200, true, 12);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'D Orge', 950, true, 13);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Scones (Pack of 4)', 1400, true, 14);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Semolina Cookies', 400, true, 15);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Power Pie', 1200, true, 16);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Fruit Scone', 800, true, 17);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Plain Scone', 800, true, 18);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Coconut Cookies (Single)', 500, true, 19);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Peanut Cookies', 450, true, 20);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Cheese Scone', 1000, true, 21);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Ring Doughnut', 0, false, 22);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Peanut Cookies (Pack of 4)', 0, false, 23);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Assorted Cherries Biscuit', 400, true, 24);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Assorted Vermicelli Biscuit', 400, true, 25);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Sausage Roll', 0, false, 26);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Plain Biscuit', 400, true, 27);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Jam Doughnut', 0, false, 28);
insert into msq_import (category, name, price, available, sort) values ('Pastries & snacks', 'Coconut Cookies (4 Pack)', 0, false, 29);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Fresh Mixed Fruit Salad', 5000, true, 1);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Mixed Fruit Salad', 2580, true, 2);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Parfait', 3500, true, 3);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Smoothie', 2000, true, 4);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Fruit Parfait', 4000, true, 5);
insert into msq_import (category, name, price, available, sort) values ('Desserts & drinks', 'Cake Parfait', 2600, true, 6);

do $marketsquare$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%market square%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Market Square', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Rice & mains', 1),
    ('Soups & swallow', 2),
    ('Meat & fish', 3),
    ('Sides & salads', 4),
    ('Bread', 5),
    ('Cakes', 6),
    ('Pastries & snacks', 7),
    ('Desserts & drinks', 8)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Rice & mains', 1),
    ('Soups & swallow', 2),
    ('Meat & fish', 3),
    ('Sides & salads', 4),
    ('Bread', 5),
    ('Cakes', 6),
    ('Pastries & snacks', 7),
    ('Desserts & drinks', 8)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from msq_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, '', i.available, i.sort
  from msq_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  );
  get diagnostics added = row_count;

  raise notice '% products corrected, % added.', moved, added;

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $marketsquare$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%market square%'
  and not exists (
    select 1 from msq_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%market square%'
order by c.sort_order, m.sort_order;

drop table if exists msq_import;
