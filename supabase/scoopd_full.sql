-- Scoopd Ice Cream Novare, the whole menu.
--
-- Built from the price list you exported: 55 products across nine
-- sections. Nothing of this menu existed before, so everything here is new.
--
-- The export gives no sections, so these are worked out from each name and
-- description. Move anything filed oddly in Admin, Menu.
--
-- ONE ROW OF THE EXPORT HAS SLIPPED A COLUMN. Twice as Nice has an empty
-- description and its wording sitting in the price cell, with the real prices
-- tacked on the end. Left alone it would have been priced from the 11,500 in
-- its own advertising copy. It is corrected here, and the generator refuses
-- to build the file if that row ever stops needing the correction.
--
-- The scoop sizes keep their own names rather than becoming a choice, because
-- Padi, Joli, Boku and Confam are what the shop calls them.
--
-- 19 products go in switched off: what the export marks out of stock, and
-- anything it prices at nothing.
--
-- Safe to run twice.

drop table if exists sc_import;
create table sc_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Retail cup (4 scoop)', 9800, true, 'Get 1 retail cups', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Plain Ice Cream Cone', 0, false, 'Plain Ice Cream Cone', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Padi (1 Scoop)', 3000, true, 'Start the fun with one scoop of indulgent ice cream', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Joli (2 Scoops)', 5800, true, '2 scoops because 1 can never be enough.', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Boku (3 Scoops)', 8400, true, '3 scoops because the more the merrier!', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Ice cream', 'Confam- 10 Scoops', 0, false, 'The best things are shared. Get this to share with friends and family. 10 scoops', 6);
insert into sc_import (category, name, price, available, description, sort) values ('Milkshakes', 'Choose Your Own Shake', 5800, true, 'Treat yourself to an indulgent, cream milkshake with your own recipe.', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Milkshakes', 'Chocolate Milkshake', 5800, true, 'Treat yourself to an indulgent, creamy chocolate milkshake with our classic recipe.', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Milkshakes', 'Caramel Milkshake', 5800, true, 'Treat yourself to an indulgent, creamy caramel milkshake with our classic recipe.', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Milkshakes', 'Vanilla Milkshake', 5800, true, 'Treat yourself to an indulgent, creamy vanilla milkshake with our classic recipe.', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Milkshakes', 'Strawberry Milkshake', 5800, true, 'Treat yourself to an indulgent, creamy strawberry milkshake with our classic recipe.', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Waffles', 'Simple Waffle', 4400, true, 'Vanilla Waffle, Butter, Maple Syrup or Honey or Strawberry Jam and Powdered Sugar', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Waffles', 'Chocolate Cake Freak', 5800, true, 'Vanilla Waffle, Choco Brownie Pcs, chocolate scoop and Chocolate Top Up', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Waffles', 'Chocoholic', 5400, true, 'Vanilla Waffle, any Scoop, Chocolate Top Up and White Chocolate Sauce', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Waffles', 'Build Your Own WAFFLE', 7500, true, 'Vanilla Waffle, 2 Scoop Ice Cream and Sauce', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Cheese Toastie', 5600, true, 'Cheese Toastie', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Chick N'' Cheez Toastie', 5600, true, 'Sliced Bread, Mozzarella cheese, Fried Chicken, Mayonoise, Peppe Sauce, Butter, Red & Green Pepper', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Chicken Shawarma Wrap', 5800, true, 'Flat bread, crispy Strips, Sausage, Cabbage, Tomato, Shawarma Sauce', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Mexican Burger', 7700, true, 'Burger Bun, Fried Chicken, Mexican sauce, BBQ Sauce, Grilled red pepper, Chedder cheese, Grilled Onions, Grilled green pepper, Tomato, Lettuce', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'GR-eat Burger', 6400, true, 'Burger Bun, Fried Chicken, GR Sauce, Mayonnaise', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Classic Chicken Burger', 6400, true, 'Burger Bun, Fried Chicken, Spicy cocktall sauce, Tomato, Lettuce', 6);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Mighty Burger', 8300, true, 'Burger Bun, Fried Chicken, Mayonnaise, Chili cocktail, BBQ sauce, Lettuce, Tomato, Cheddar Cheese, Plantain Cubs', 7);
insert into sc_import (category, name, price, available, description, sort) values ('Burgers & wraps', 'Scoop''d BBQ Burger', 7700, true, 'Burger Bun, Chicken Strips, BBQ Sauce, Pickles, Tomato and Mozzarella', 8);
insert into sc_import (category, name, price, available, description, sort) values ('Chicken & sides', 'Crispy Chicken Basket', 8500, true, '4 Chicken Strips, French Fries, Sauce, Drink and Toast', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Chicken & sides', 'Friestatic (Fries + Coke )', 4000, true, 'French Fries, Sauce and Coke', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Sausage Roll', 0, false, 'Savoury pastry dough wrapped around a well-seasoned sausage.', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Sausage Snack', 0, false, 'A savory pastry dough wrapped around a well-seasoned mini Frankfurt sausage—perfectly baked for a delicious, satisfying treat.', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Chocolate Croissant', 0, false, 'Buttery, flaky and delicious with some chocolate.', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Bread Loaf (840g)', 2300, true, 'Freshly baked bread', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Burger Buns (4 plain pieces)', 0, false, 'Freshly baked burger buns', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Strawberry Cake Tart', 0, false, 'This delicious pastry is filled with delicious stawberry jam to make a perfect dessert.', 6);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Plain Croissant', 0, false, 'Buttery, flaky and delicious.', 7);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Sausage Twist', 0, false, 'Sausage Twist is the perfect blend of juicy, savory sausage wrapped in a golden, flaky pastry spiral.', 8);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Vanilla Cake Slice', 0, false, 'A slice of moist vanilla cake', 9);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Chocolate Cake Slice', 2000, true, 'A slice of moist Chocolate cake', 10);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Full Vanilla Cake', 8800, true, 'Moist vanilla cake', 11);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Chocolate Chip Cookie', 0, false, 'Our Chocolate chip cookie is a sweet baked treat that is recognized by its butter flavor and the inclusion of chocolate chips', 12);
insert into sc_import (category, name, price, available, description, sort) values ('Bakery & cakes', 'Full Chocolate Cake', 8800, true, 'Moist chocolate cake', 13);
insert into sc_import (category, name, price, available, description, sort) values ('Hot drinks', 'Hot Chocolate', 0, false, 'Delicious hot cocoa drink', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Hot drinks', 'Latte', 0, false, 'Delicious latte mixed with hot or steamed milk', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Hot drinks', 'Cappuccino', 0, false, 'Delicious espresso coffee topped with frothed hot milk', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Hot drinks', 'Americano', 0, false, 'Tastefully brewed coffee.', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Soft drinks', 'Sprite 35cl', 800, true, 'Sprite 35cl', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Soft drinks', '5Alive Orange', 0, false, '5Alive Orange', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Soft drinks', 'Fanta 35cl', 0, false, 'Fanta 35cl', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Soft drinks', 'Coca-Cola 35cl', 800, true, 'Coca-Cola 35cl', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Soft drinks', 'Eva Water 75cl', 700, true, 'Eva Water 75cl', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Biggg shawarma deal', 6600, true, 'Enjoy our signature Biggg Shawarma, expertly crafted and perfectly paired with a chilled soft drink', 1);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Cake N Shake Deal', 7800, true, 'Build your own shake + cake slice (either chocolate or vanilla)', 2);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Bbn deal', 6300, true, '1 Shawarma and 1 Soft Drink', 3);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Double the joy', 19600, true, 'Save big! Get 2 retail cups of Scoop''d Ice Cream for #16,500', 4);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Burger Deal', 0, false, 'Indulge in our mouthwatering Burger Deal – the perfect trio for your taste buds!, Enjoy 1 Chicken burger +Fries + soft drink', 5);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Monday saver''s deal', 0, false, 'Enjoy a mouthwatering Chicken Burger, crispy fries, a scoop of creamy ice cream, and a refreshing bottle of Coca-Cola', 6);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Burger Ice', 9400, true, 'A perfect pairing of savory and sweet – 1 juicy chicken burger + 1 scoop of creamy ice cream', 7);
insert into sc_import (category, name, price, available, description, sort) values ('Deals', 'Twice as Nice', 19600, true, 'Buy 2 retail cups of Scoop''d Ice Cream for 11,500', 8);

do $scoopd$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%scoop%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Scoop''d Ice Cream', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Ice cream', 1),
    ('Milkshakes', 2),
    ('Waffles', 3),
    ('Burgers & wraps', 4),
    ('Chicken & sides', 5),
    ('Bakery & cakes', 6),
    ('Hot drinks', 7),
    ('Soft drinks', 8),
    ('Deals', 9)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Ice cream', 1),
    ('Milkshakes', 2),
    ('Waffles', 3),
    ('Burgers & wraps', 4),
    ('Chicken & sides', 5),
    ('Bakery & cakes', 6),
    ('Hot drinks', 7),
    ('Soft drinks', 8),
    ('Deals', 9)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from sc_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from sc_import i
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
end $scoopd$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%scoop%'
  and not exists (
    select 1 from sc_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%scoop%'
order by c.sort_order, m.sort_order;

drop table if exists sc_import;
