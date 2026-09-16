-- Chicken Republic Sangotedo menu, as listed publicly.
-- 64 items in 8 categories, 52 of them priced.
-- Anything without a price, or marked out of stock where it was copied, is
-- created switched off so it cannot be ordered until you price it in
-- Admin, Menu. Check every price at the counter before the first run.
--
-- Safe to run twice: it skips anything already there.

do $$
declare
  r uuid;
  c uuid;
begin
  select id into r from restaurants where name ilike '%Chicken%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active, sort_order)
    values ('Chicken Republic Sangotedo', 'Novare Mall, Sangotedo', time '22:00', true, 10)
    returning id into r;
  end if;

  -- Burgers & sandwiches (13)
  select id into c from menu_categories where restaurant_id = r and name = 'Burgers & sandwiches';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Burgers & sandwiches', 1) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Original ChickWhizz Breakfast Combo', 3900, 'Enjoy our Sandwich filled with Soulfully Spiced Chicken, Lettuce and our Secret Mayo', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Original ChickWhizz Breakfast Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chief Burger', 5100, 'Enjoy a Mighty Chief Burger made with Soulfully Spiced Fried Chicken, Lettuce, Cheese and our Secret Sauce on a Fresh Bun', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chief Burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Shawarma', 4100, 'Soulfully Spiced Fried Chicken with Lettuce and our Secret Sauce in a fresh Tortilla Wrap', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Shawarma');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Shawarma Combo', 7100, 'Soulfully Spiced Fried Chicken with Lettuce and our Secret Sauce in a fresh Tortilla Wrap served with Regular Chips and a refreshing PET drink', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Shawarma Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Big Boyz Combo', 9100, 'Enjoy a Chief Burger with one piece of Soulfully Spiced Fried Chicken with your choice of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans, plus a drink of your choice', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Big Boyz Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Double ChickWhizz Meal', 8100, 'Double the enjoyment with our ChickWhizz Sandwich filled with Soulfully Spiced Fried Chicken, Lettuce and our Secret Mayo served with Regular Chips and a refreshing PET drink', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Double ChickWhizz Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Original ChickWhizz', 3400, 'Get the original ChickWhizz sandwich filled with Soulfully Spiced Chicken, Lettuce and our Secret Mayo Sauce', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Original ChickWhizz');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Double Chief Burger Combo', 11500, 'Prepare yourself for double the deliciousness and double the satisfaction with our Chief Burger Combo with chips & a PET drink!', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Double Chief Burger Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'ChickWhizz Meal', 6400, 'Double the enjoyment with our ChickWhizz Sandwich filled with Soulfully Spiced Fried Chicken, Lettuce and our Secret Mayo served with Regular Chips and a refreshing PET drink', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'ChickWhizz Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chief Burger Combo', 7900, 'Prepare yourself for double the deliciousness and double the satisfaction with our Chief Burger Combo with chips & a PET drink!', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chief Burger Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bigwhizz Reloaded', 0, 'Enjoy a Chickwhizz with one piece of Soulfully Spiced Fried Chicken with your choice of Fried Rice, Naija Jollof, plus a drink of your choice', false, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bigwhizz Reloaded');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Big Whizz Meal', 0, 'Enjoy a Chickwhizz with one piece of Soulfully Spiced Fried Chicken with your choice of Fried Rice, Naija Jollof, plus a drink of your choice', false, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Big Whizz Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pastry Breakfast Combo', 0, 'Kickstart your day with Pastry + Coffee/Tea', false, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pastry Breakfast Combo');

  -- Citizens meals (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Citizens meals';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Citizens meals', 2) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Citizens Meal without drink', 6200, 'Two mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Citizens Meal without drink');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Citizens Spicy Yam Meal', 7100, '2 pieces of Soulfully Spiced Fried Chicken served with our New Spicy Yam, FREE pepper sauce and a PET drink', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Citizens Spicy Yam Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Citizens Meal', 6700, 'Two mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice + a refreshing PET drink', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Citizens Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Citizens Meal BOGOF', 0, 'Enjoy a Buy 1 get 1 free offer on Citizens meal, comes with four mouth-watering pieces of Soulfully Spiced Chicken served with a side of your choice. Does not include a drink', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Citizens Meal BOGOF');

  -- Drinks (17)
  select id into c from menu_categories where restaurant_id = r and name = 'Drinks';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Drinks', 3) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5Alive Pulpy Orange (85cl)', 2300, '', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5Alive Pulpy Orange (85cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5Alive Mango Burst (90cl)', 2300, '', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5Alive Mango Burst (90cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Fanta Orange (50cl)', 900, '', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Fanta Orange (50cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Schweppes (40cl)', 900, '', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Schweppes (40cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5Alive Pulpy (30cl)', 1300, '5Alive Pulpy Orange, Pulpy Lemon, Mango Bits', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5Alive Pulpy (30cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Coca Cola (50cl)', 900, '', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Coca Cola (50cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '3 IN 1 Nescafe', 600, '', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = '3 IN 1 Nescafe');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mineral Water (75cl)', 600, '', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mineral Water (75cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sprite (50cl)', 900, '', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sprite (50cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Monster Energy', 1800, 'Monster Energy Regular, Fury, Ultra', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Monster Energy');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Predator', 1200, 'Predator Gold, Mean Green', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Predator');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Coca Cola (35cl)', 600, '', true, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Coca Cola (35cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sprite (35cl)', 600, 'Sprite (50cl)', true, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sprite (35cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Fanta Orange (35cl)', 600, '', true, 14
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Fanta Orange (35cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5Alive Cocopine (78cl)', 0, '', false, 15
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5Alive Cocopine (78cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5Alive Berry Blast (78cl)', 0, '', false, 16
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5Alive Berry Blast (78cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '3 IN 1 MILO', 0, '', false, 17
  where not exists (select 1 from menu_items where restaurant_id = r and name = '3 IN 1 MILO');

  -- Everyday affordable value meals (6)
  select id into c from menu_categories where restaurant_id = r and name = 'Everyday affordable value meals';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Everyday affordable value meals', 4) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spicy Yam Meal', 3500, 'One piece of Soulfully Spiced Fried Chicken served with our New Spicy Yam and a FREE pepper sauce', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spicy Yam Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Refuel Max Combo', 3900, 'One piece of Soulfully Spiced Fried Chicken served with Fried Rice, Naija Jollof, Rice & Beans, White Rice with Sauce or Spaghetti + our new yummy sauce + Coleslaw or Moin Moin and a refreshing PET drink', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Refuel Max Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Refuel Meal', 2600, 'One piece of Soulfully Spiced Fried Chicken served with your choice of Fried Rice, Naija Jollof, Rice & Beans, White Rice with Sauce or Spaghetti with our new yummy sauce.', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Refuel Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Express Combo', 5400, 'One piece of Soulfully Spiced Fried Chicken with Regular Chips plus a refreshing PET drink', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Express Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spicy Yam Combo', 0, 'One piece of Soulfully Spiced Fried Chicken served with our New Spicy Yam plus our newly improved Moin Moin or Coleslaw, FREE pepper sauce and a PET drink', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spicy Yam Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Refuel More', 0, 'Enjoy our new smokey jollof, it comes with an extra large portion of Jollof, a portion of plantain & a piece of chicken & 60cl drink', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Refuel More');

  -- Pot meals (5)
  select id into c from menu_categories where restaurant_id = r and name = 'Pot meals';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pot meals', 5) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'POT Chicken (8 Pieces)', 19700, 'Soulfully Spiced Chicken - Available as Spicy Fried, Crunchy or Rotisserie', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'POT Chicken (8 Pieces)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'MAXI POT Lovers Meal', 30700, 'Enjoy 8 pieces of Soulfully Spiced Fried Chicken with your choice of 4 x portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 2 x portions of Dodo Cubes, Moin Moin or Coleslaw and 4 x PET drinks', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'MAXI POT Lovers Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Big Crew Meal', 31200, 'Enjoy a succulent full Rotisserie Chicken served with 4 portions of Spaghetti, Fried or Naija Jollof PLUS 2 portions of Coleslaw, Moin-Moin or Dodo Cubes and 4 x PET drinks', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Big Crew Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'MEGA Pot Lovers Meal', 41800, 'Enjoy 10 pieces of Soulfully Spiced Fried Chicken with your choice of 6 portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 4 portions of Dodo Cubes, Moin Moin or Coleslaw and 6 PET drinks', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'MEGA Pot Lovers Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'MINI Pot Lovers Meal', 15350, 'Enjoy 4 pieces of Soulfully Spiced Fried Chicken with your choice of 2 portions of Spaghetti, Fried Rice, Naija Jollof or Rice & Beans plus 1 portion of Moin Moin or Coleslaw and 2 PET drinks', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'MINI Pot Lovers Meal');

  -- Rotisserie chicken (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Rotisserie chicken';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Rotisserie chicken', 6) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Full Rotisserie Chicken', 21200, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Full Rotisserie Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Quarter Rotisserie Combo', 9100, 'Enjoy a succulent 1/4 Rotisserie Chicken served with a side of your choice PLUS a refreshing PET drink', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Quarter Rotisserie Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Quarter Rotisserie Chicken', 5400, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Quarter Rotisserie Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Half Rotisserie Chicken', 0, 'Succulent & juicy Rotisserie Chicken flavoured to perfection with our authentic West African Herbs & Spices!', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Half Rotisserie Chicken');

  -- Specials (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Specials';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Specials', 7) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Citizens Rice & Beans Combo', 7400, 'Rice & Beans cooked to perfection and served with our delicious master sauce with drink of choice', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Citizens Rice & Beans Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Rice & Beans Meal', 3300, 'Rice & Beans with sauce cooked to perfection and served with our delicious master sauce with 1 piece chicken', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Rice & Beans Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Carribean Meal', 0, 'Soulfully Spiced Basmati rice garnished with veggies, diced chicken and plantain, served with Fried chicken.', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Carribean Meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Stir-Fried Meal', 0, 'Delicious Basmati rice garnished stir-fried with veggies, served with Soulfully Spiced fried chicken.', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Stir-Fried Meal');

  -- Tasty sides (11)
  select id into c from menu_categories where restaurant_id = r and name = 'Tasty sides';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Tasty sides', 8) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spicy Yam', 2200, 'Delicious Spicy Yam Chips served with our signature pepper sauce. Available in Regular or Large', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spicy Yam');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Amma Jamma - Shitor Sauce', 3500, '', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Amma Jamma - Shitor Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepper Sauce', 600, '', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepper Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Soulfully Spiced Fried Chicken', 2500, 'Soulfully Spiced Chicken - Available as Spicy Fried, Crunchy or Rotisserie 1piece, 2 pieces, 4 pieces Pot', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Soulfully Spiced Fried Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Republic Loaf', 1900, 'Enjoy our hot, fresh and tasty republic loaf', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Republic Loaf');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chips', 2600, 'A portion of golden fried chips. Available in Regular or Large', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chips');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spaghetti', 1800, 'A regular, large or jumbo portion of perfectly prepared Spaghetti enhanced with red peppers, herbs and spices. Does not come with Chicken', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spaghetti');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Amma Jamma - Rodo Sauce', 3500, '', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Amma Jamma - Rodo Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Dodo Cubes', 1100, 'A regular or large portion of golden delicious Plantain cubes, fried to perfection', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Dodo Cubes');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Rice & Beans', 2100, 'A regular, large or jumbo portion of Rice & Beans cooked to perfection. Does not come with chicken', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Rice & Beans');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Moin-Moin', 1400, 'A single portion of our delicious, newly improved Moin Moin now with more flavour and more nutrients', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Moin-Moin');

end $$;

notify pgrst, 'reload schema';
