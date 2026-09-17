-- Chicken Republic Sangotedo, the whole menu.
--
-- Built from the price list you exported: 76 products across eight
-- sections. It supersedes chicken_republic_menu.sql and is the one file to
-- run when the menu changes.
--
-- Where a card carries two prices, the dearer one is used.
--
-- 15 products the export marks out of stock go in switched off. They will
-- read "Sold out today" on the menu until you turn them on in Admin, Menu.
-- Each keeps a price, so turning one on is a single tap. To leave them out
-- altogether instead, run the delete at the foot of this file.
--
-- Matching is on the name with case, spaces and punctuation ignored, so
-- nothing already on the menu is duplicated. Anything already there keeps its
-- photograph and moves to the section and price below.
--
-- Safe to run twice.

drop table if exists cr_import;
create table cr_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

insert into cr_import (category, name, price, available, description, sort) values
  ('Burgers & sandwiches', 'Bigwhizz Reloaded', 9700, true, 'Enjoy a Chickwhizz with one piece of Soulfully Spiced Fried Chicken with your choice of Fried Rice, Naija Jollof, plus a drink of your choice', 1),
  ('Burgers & sandwiches', 'Big Whizz Meal', 8800, true, 'Enjoy a Chickwhizz with one piece of Soulfully Spiced Fried Chicken with your choice of Fried Rice, Naija Jollof, plus a drink of your choice', 2),
  ('Burgers & sandwiches', 'Original ChickWhizz Breakfast Combo', 3900, true, 'Enjoy our Sandwich filled with Soulfully Spiced Chicken, Lettuce and our Secret Mayo', 3),
  ('Burgers & sandwiches', 'Pastry Breakfast Combo', 1700, true, 'Kickstart your day with Pastry + Coffee/Tea', 4),
  ('Burgers & sandwiches', 'Chief Burger', 5100, true, 'Enjoy a Mighty Chief Burger made with Soulfully Spiced Fried Chicken, Lettuce, Cheese and our Secret Sauce on a Fresh Bun', 5),
  ('Burgers & sandwiches', 'Shawarma', 4100, true, 'Soulfully Spiced Fried Chicken with Lettuce and our Secret Sauce in a fresh Tortilla Wrap', 6),
  ('Burgers & sandwiches', 'Shawarma Combo', 7100, true, 'Soulfully Spiced Fried Chicken with Lettuce and our Secret Sauce in a fresh Tortilla Wrap served with Regular Chips and a refreshing PET drink', 7),
  ('Burgers & sandwiches', 'Big Boyz Combo', 9100, true, 'Enjoy a Chief Burger with one piece of Soulfully Spiced Fried Chicken with your choice of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans, plus a drink of your choice', 8),
  ('Burgers & sandwiches', 'Double ChickWhizz Meal', 8100, true, 'Double the enjoyment with our ChickWhizz Sandwich filled with Soulfully Spiced Fried Chicken, Lettuce and our Secret Mayo served with Regular Chips and a refreshing PET drink', 9),
  ('Burgers & sandwiches', 'Original ChickWhizz', 3400, true, 'Get the original ChickWhizz sandwich filled with Soulfully Spiced Chicken, Lettuce and our Secret Mayo Sauce', 10),
  ('Burgers & sandwiches', 'Double Chief Burger Combo', 11500, true, 'Prepare yourself for double the deliciousness and double the satisfaction with our Chief Burger Combo with chips & a PET drink!', 11),
  ('Burgers & sandwiches', 'Chief Burger Combo', 7900, true, 'Prepare yourself for double the deliciousness and double the satisfaction with our Chief Burger Combo with chips & a PET drink!', 12),
  ('Burgers & sandwiches', 'ChickWhizz Meal', 6400, false, 'Double the enjoyment with our ChickWhizz Sandwich filled with Soulfully Spiced Fried Chicken, Lettuce and our Secret Mayo served with Regular Chips and a refreshing PET drink', 13),
  ('Citizens meals', 'Citizens Meal BOGOF', 10600, true, 'Enjoy a Buy 1 get 1 free offer on Citizens meal, comes with four mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice. Does not include a drink', 1),
  ('Citizens meals', 'Citizens Meal without drink', 6200, true, 'Two mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice', 2),
  ('Citizens meals', 'Citizens Spicy Yam Meal', 7100, true, '2 pieces of Soulfully Spiced Fried Chicken served with our New Spicy Yam, FREE pepper sauce and a PET drink', 3),
  ('Citizens meals', 'Citizens Meal', 6700, true, 'Two mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice + a refreshing PET drink', 4),
  ('Everyday affordable value meals', 'Spicy Yam Meal', 3500, true, 'One piece of Soulfully Spiced Fried Chicken served with our New Spicy Yam and a FREE pepper sauce', 1),
  ('Everyday affordable value meals', 'Refuel Max Combo', 3900, true, 'One piece of Soulfully Spiced Fried Chicken served with Fried Rice, Naija Jollof, Rice & Beans, White Rice with Saucewith Sauce or Spaghetti + our new yummy sauce + Coleslaw or Moin Moin and a refreshing PET drink', 2),
  ('Everyday affordable value meals', 'Refuel Meal', 2600, true, 'One piece of Soulfully Spiced Fried Chicken served with your choice of Fried Rice, Naija Jollof, Rice & Beans, White Rice with Saucewith Sauce or Spaghetti with our new yummy sauce.', 3),
  ('Everyday affordable value meals', 'Express Combo', 5400, true, 'One piece of Soulfully Spiced Fried Chicken with Regular Chips plus a refreshing PET drink', 4),
  ('Everyday affordable value meals', 'Spicy Yam Combo', 0, false, 'One piece of Soulfully Spiced Fried Chicken served with our New Spicy Yam plus our newly improved Moin Moin or Coleslaw, FREE pepper sauce and a PET drink', 5),
  ('Everyday affordable value meals', 'Refuel More', 0, false, 'Enjoy our new smokey jollof, it comes with an extra large portion of Jollof, a portion of plantain & a piece of chicken & 60cl drink', 6),
  ('Pot meals', 'POT Chicken (8 Pieces)', 19700, true, 'Soulfully Spiced Chicken - Available as Spicy Fried, Crunchy or Rotisserie', 1),
  ('Pot meals', 'MAXI POT Lovers Meal', 30700, true, 'Enjoy 8 pieces of Soulfully Spiced Fried Chicken with your choice of 4 x portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 2 x portions of Dodo Cubes, Moin Moin or Coleslaw and 4 x PET drinks', 2),
  ('Pot meals', 'MEGA Pot Lovers Meal', 41800, true, 'Enjoy 10 pieces of Soulfully Spiced Fried Chicken with your choice of 6 portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 4 portions of Dodo Cubes, Moin Moin or Coleslaw and 6 PET drinks', 3),
  ('Pot meals', 'MINI Pot Lovers Meal', 15350, true, 'Enjoy 4 pieces of Soulfully Spiced Fried Chicken with your choice of 2 portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 1 portion of Moin Moin or Coleslaw and 2 PET drinks', 4),
  ('Pot meals', 'Big Crew Meal', 31200, false, 'Enjoy a succulent full Rotisserie Chicken served with 4 portions of Spaghetti, Fried or Naija Jollof PLUS 2 portions of Coleslaw, Moin-Moin or Dodo Cubes and 4 x PET drinks', 5),
  ('Rotisserie chicken', 'Full Rotisserie Chicken', 21200, true, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', 1),
  ('Rotisserie chicken', 'Quarter Rotisserie Combo', 9100, true, 'Enjoy a succulent 1/4 Rotisserie Chicken served with a side of your choice PLUS a refreshing PET drink', 2),
  ('Rotisserie chicken', 'Quarter Rotisserie Chicken', 5400, true, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', 3),
  ('Rotisserie chicken', 'Half Rotisserie Chicken', 0, false, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', 4),
  ('Specials', 'Carribean Meal', 5200, true, 'Soulfully Spiced Basmati rice garnished with veggies, diced chicken and plantain, served with Fried chicken.', 1),
  ('Specials', 'Citizens Rice & Beans Combo', 7400, true, 'Rice & Beans cooked to perfection and served with our delicious master sauce with drink of choice', 2),
  ('Specials', 'Rice & Beans Meal', 3300, true, 'Rice & Beans with sauce cooked to perfection and served with our delicious master sauce with 1 piece chicken', 3),
  ('Specials', 'Carribean Meal Combo', 5700, true, 'Soulfully Spiced Basmati rice garnished with veggies, diced chicken and plantain, served with Quarter Rotisserie chicken and a PET drink.', 4),
  ('Specials', 'Stir-Fried Meal', 0, false, 'Delicious Basmati rice garnished stir-fried with veggies, served with Soulfully Spiced fried chicken.', 5),
  ('Specials', 'Stir-Fried Meal Combo', 0, false, 'Delicious Basmati rice garnished stir-fried with veggies, served with Soulfully Spiced fried chicken and a PET drink.', 6),
  ('Tasty sides', 'Spicy Yam', 2200, true, 'Delicious Spicy Yam Chips served with our signature pepper sauce. Available in Regular or Large', 1),
  ('Tasty sides', 'Chicken Pie', 1200, true, 'Enjoy our hot, fresh and tasty pies with your choice of delicious Chicken or Beef filling', 2),
  ('Tasty sides', 'White Rice with Sauce', 1800, true, 'A regular, large or jumbo portion of white rice, does not come with Chicken', 3),
  ('Tasty sides', 'Amma Jamma - Shitor Sauce', 3500, true, 'Amma Jamma - Shitor Sauce', 4),
  ('Tasty sides', 'Pepper Sauce', 600, true, 'Pepper sauce', 5),
  ('Tasty sides', 'Caribbean Rice', 3000, true, 'Soulfully Spiced Basmati rice garnished with veggies, diced chicken and plantain. Does not come with Chicken', 6),
  ('Tasty sides', 'Soulfully Spiced Fried Chicken', 2500, true, 'Soulfully Spiced Chicken - Available as Spicy Fried, Crunchy or Rotisserie 1piece, 2 pieces, 4 pieces Pot', 7),
  ('Tasty sides', 'Fried Rice', 1800, true, 'A regular, large or Jumbo portion of Fried Rice - now with more veggies and other secret ingredients for a more delicious flavour. Does not come with Chicken', 8),
  ('Tasty sides', 'Chips', 2600, true, 'A portion of golden fried chips. Available in Regular or Large', 9),
  ('Tasty sides', 'Spaghetti', 1800, true, 'A regular, large or jumbo portion of perfectly prepared Spaghetti enhanced with red peppers, herbs and spices. Does not come with Chicken', 10),
  ('Tasty sides', 'Coleslaw', 1100, true, 'A regular or large portion of garden fresh Coleslaw prepared with our tasty mayonnaise', 11),
  ('Tasty sides', 'Chicken Salad', 3600, true, 'Garden fresh salad with succulent Rotisserie Chicken and a delicious dressing', 12),
  ('Tasty sides', 'Amma Jamma - Rodo Sauce', 3500, true, 'Amma Jamma - Rodo Sauce', 13),
  ('Tasty sides', 'Dodo Cubes', 1100, true, 'A regular or large portion of golden delicious Plantain cubes, fried to perfection', 14),
  ('Tasty sides', 'Meat Pie', 1200, true, 'Enjoy our hot, fresh and tasty pies with your choice of delicious Chicken or Beef filling', 15),
  ('Tasty sides', 'Rice & Beans', 2100, true, 'A regular, large or jumbo portion of Rice & Beans cooked to perfection and served with our delicious Rice & Beans. Does not come with chicken', 16),
  ('Tasty sides', 'Pasta Salad', 0, false, 'A regular or large portion of pasta salad prepared with fresh veggies and our special mayo dressing', 17),
  ('Tasty sides', 'Stir-Fried Rice', 0, false, 'Delicious Basmati rice, stir-fried garnished with veggies. Does not come with Chicken', 18),
  ('Tasty sides', 'Republic Loaf', 1900, false, 'Enjoy our hot, fresh and tasty republic loaf', 19),
  ('Tasty sides', 'Smoky Jollof', 0, false, 'A regular, large or jumbo portion of Naija Jollof Rice. Does not come with chicken', 20),
  ('Tasty sides', 'Moin-Moin', 1400, false, 'A single portion of our delicious, newly improved Moin Moin now with more flavour and more nutrients', 21),
  ('Drinks', '5Alive Pulpy Orange (85cl)', 2300, true, '5Alive Pulpy Orange (85cl)', 1),
  ('Drinks', '5Alive Mango Burst (90cl)', 2300, true, '5Alive Mango Burst (90cl)', 2),
  ('Drinks', 'Fanta Orange (50cl)', 900, true, 'Fanta Orange (50cl)', 3),
  ('Drinks', 'Schweppes (40cl)', 900, true, 'Schweppes (40cl)', 4),
  ('Drinks', '5Alive Pulpy (30cl)', 1300, true, '5Alive Pulpy Orange, Pulpy Lemon, Mango Bits', 5),
  ('Drinks', 'Coca Cola (50cl)', 900, true, 'Coca Cola (50cl)', 6),
  ('Drinks', '3 IN 1 Nescafe', 600, true, '3 IN 1 Nescafe', 7),
  ('Drinks', 'Mineral Water (75cl)', 600, true, 'Mineral Water (75cl)', 8),
  ('Drinks', 'Sprite (50cl)', 900, true, 'Sprite (50cl)', 9),
  ('Drinks', 'Monster Energy', 1800, true, 'Monster Energy Regular, Fury, Ultra', 10),
  ('Drinks', 'Predator', 1200, true, 'Predator Gold, Mean Green', 11),
  ('Drinks', 'Coca Cola (35cl)', 600, true, 'Coca Cola (35cl)', 12),
  ('Drinks', 'Sprite (35cl)', 600, true, 'Sprite (50cl)', 13),
  ('Drinks', 'Fanta Orange (35cl)', 600, true, 'Fanta Orange (35cl)', 14),
  ('Drinks', '5Alive Cocopine (78cl)', 0, false, '5Alive Cocopine (78cl)', 15),
  ('Drinks', '5Alive Berry Blast (78cl)', 0, false, '5Alive Berry Blast (78cl)', 16),
  ('Drinks', '3 IN 1 MILO', 0, false, '3 IN 1 MILO', 17);

do $chickenrepublic$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Chicken Republic Sangotedo', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Burgers & sandwiches', 1),
    ('Citizens meals', 2),
    ('Everyday affordable value meals', 3),
    ('Pot meals', 4),
    ('Rotisserie chicken', 5),
    ('Specials', 6),
    ('Tasty sides', 7),
    ('Drinks', 8)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Burgers & sandwiches', 1),
    ('Citizens meals', 2),
    ('Everyday affordable value meals', 3),
    ('Pot meals', 4),
    ('Rotisserie chicken', 5),
    ('Specials', 6),
    ('Tasty sides', 7),
    ('Drinks', 8)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  -- Already on the menu: renamed to match the list, priced, and filed.
  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from cr_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from cr_import i
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
end $chickenrepublic$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%chicken republic%'
  and not exists (
    select 1 from cr_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%chicken republic%'
order by c.sort_order, m.sort_order;

drop table if exists cr_import;

-- TO LEAVE THE OUT OF STOCK ONES OFF THE MENU ENTIRELY, uncomment this.
-- An item that has been ordered is kept, since an order has to keep pointing
-- at what was ordered.
--
-- delete from menu_items m
-- using restaurants r
-- where m.restaurant_id = r.id
--   and r.name ilike '%chicken republic%'
--   and not m.available
--   and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);
