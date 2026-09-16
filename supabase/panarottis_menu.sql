-- Panarottis Novare menu, as listed publicly.
-- 78 items in 5 categories, 73 of them priced.
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
  select id into r from restaurants where name ilike '%Panarottis%' limit 1;
  -- The seed ships it hidden; a real menu means it can go on the site.
  update restaurants set active = true where id = r;
  if r is null then
    insert into restaurants (name, address, closes_at, active, sort_order)
    values ('Panarottis Novare', 'Shop C05, Novare Mall, Sangotedo', time '22:00', true, 10)
    returning id into r;
  end if;

  -- Starters (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Starters';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Starters', 1) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Flatbread Standard', 2900, 'Garlic or herb flatbread baked to perfection.', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Flatbread Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Flatbread Large', 3700, 'Garlic or herb flatbread baked to perfection.', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Flatbread Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Three Cheese Standard', 8700, 'Flatbread topped with mozzarella, Cheddar and feta cheese.', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Three Cheese Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Three Cheese Large', 13800, 'Flatbread topped with mozzarella, Cheddar and feta cheese.', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Three Cheese Large');

  -- Pastas (7)
  select id into c from menu_categories where restaurant_id = r and name = 'Pastas';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pastas', 2) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Alfredo', 15000, 'Crispy bacon, ham and brown mushrooms in a rich, cream-based sauce.', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Alfredo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chorizo Pasta Danielle', 15000, 'With or without olives. Chorizo sausage, brown mushrooms and sauteed onions in a creamy tomato-based sauce.', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chorizo Pasta Danielle');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Capricciosa', 11500, 'Oven-roasted chicken, assorted peppers and brown mushrooms in a cream-based sauce.', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Capricciosa');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Carne', 15500, 'Crispy bacon, chorizo sausage, salami, onions and assorted peppers in a creamy tomato-based sauce.', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Carne');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Milano', 15000, 'Chicken breasts sauteed with brown mushrooms, onions and assorted peppers on fettuccine, layered with Cheddar.', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Milano');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spaghetti Bolognese', 0, 'Traditional ground beef in a tomato-based sauce.', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spaghetti Bolognese');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Spaghetti & Meatballs', 0, 'Spaghetti and meatballs in a tomato-based sauce with basil, oregano and garlic.', false, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Spaghetti & Meatballs');

  -- Salad (2)
  select id into c from menu_categories where restaurant_id = r and name = 'Salad';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Salad', 3) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Greek Salad', 16700, 'Garden salad with feta and Calamata olives.', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Greek Salad');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Caesar Salad', 14400, 'Garden salad with bacon, mushrooms and roast chicken.', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Caesar Salad');

  -- Pizzas (48)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizzas';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizzas', 4) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Duo Pizza Monsterito', 40200, 'Two favourite pizzas in one: meat supreme, chicken supreme, margarita, carnivore.', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Duo Pizza Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Duo Pizza Large', 25300, 'Two favourite pizzas in one: meat supreme, chicken supreme, margarita, carnivore.', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Duo Pizza Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Duo Pizza Standard', 16700, 'Chicken supreme and meat supreme, or margarita.', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Duo Pizza Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Meat Supreme Standard', 16100, 'Bacon, ham, chorizo sausage and bolognese mince, drizzled in cheesy BBQ sauce.', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Meat Supreme Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Meat Supreme Large', 24700, 'Bacon, ham, chorizo sausage and bolognese mince, drizzled in cheesy BBQ sauce.', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Meat Supreme Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Meat Supreme Monsterito', 39700, 'Bacon, ham, chorizo sausage and bolognese mince, drizzled in cheesy BBQ sauce.', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Meat Supreme Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Carnivore Standard', 15500, 'Salami, chorizo sausage, bacon and ham.', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Carnivore Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Carnivore Large', 21900, 'Salami, chorizo sausage, bacon and ham.', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Carnivore Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Carnivore Monsterito', 37400, 'Salami, chorizo sausage, bacon and ham.', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Carnivore Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Panarottis Special Standard', 19000, 'Salami, ham, mushrooms, pineapple and Calamata olives.', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Panarottis Special Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Panarottis Special Large', 24700, 'Salami, ham, mushrooms, pineapple and Calamata olives.', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Panarottis Special Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Panarottis Special Monsterito', 42500, 'Salami, ham, mushrooms, pineapple and Calamata olives.', true, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Panarottis Special Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Mexicana Standard', 13800, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Mexicana Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Mexicana Large', 20700, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 14
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Mexicana Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Mexicana Monsterito', 36200, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 15
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Mexicana Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mexicana Standard', 15000, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 16
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mexicana Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mexicana Large', 20700, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 17
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mexicana Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mexicana Monsterito', 36200, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', true, 18
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mexicana Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Rib & Chicken Standard', 13800, 'Deboned pork ribs in sticky BBQ basting, roast chicken and cherry tomatoes.', true, 19
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Rib & Chicken Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Rib & Chicken Large', 19000, 'Deboned pork ribs in sticky BBQ basting, roast chicken and cherry tomatoes.', true, 20
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Rib & Chicken Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Rib & Chicken Monsterito', 29900, 'Deboned pork ribs in sticky BBQ basting, roast chicken and cherry tomatoes.', true, 21
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Rib & Chicken Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Salami & Chorizo Standard', 13800, 'Salami and chorizo.', true, 22
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Salami & Chorizo Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Salami & Chorizo Large', 19600, 'Salami and chorizo.', true, 23
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Salami & Chorizo Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Salami & Chorizo Monsterito', 29900, 'Salami and chorizo.', true, 24
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Salami & Chorizo Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken Supreme Standard', 16100, 'Roast chicken, bacon and ham, drizzled in sweet chilli mayo.', true, 25
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken Supreme Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken Supreme Large', 24700, 'Roast chicken, bacon and ham, drizzled in sweet chilli mayo.', true, 26
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken Supreme Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken Supreme Monsterito', 39100, 'Roast chicken, bacon and ham, drizzled in sweet chilli mayo.', true, 27
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken Supreme Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Vegetarian Standard', 17300, 'Cherry tomatoes, onions, assorted peppers, mushrooms and pineapple.', true, 28
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Vegetarian Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Vegetarian Large', 20100, 'Cherry tomatoes, onions, assorted peppers, mushrooms and pineapple.', true, 29
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Vegetarian Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Vegetarian Monsterito', 29900, 'Cherry tomatoes, onions, assorted peppers, mushrooms and pineapple.', true, 30
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Vegetarian Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken & Mushroom Standard', 13300, 'Roast chicken and mushrooms, drizzled in sweet chilli mayo.', true, 31
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken & Mushroom Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken & Mushroom Large', 18400, 'Roast chicken and mushrooms, drizzled in sweet chilli mayo.', true, 32
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken & Mushroom Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Saucy Chicken & Mushroom Monsterito', 34500, 'Roast chicken and mushrooms, drizzled in sweet chilli mayo.', true, 33
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Saucy Chicken & Mushroom Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sweet Chilli Chicken & Feta Standard', 17300, 'Roast chicken, feta and sweet chilli sauce.', true, 34
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sweet Chilli Chicken & Feta Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sweet Chilli Chicken & Feta Large', 25300, 'Roast chicken, feta and sweet chilli sauce.', true, 35
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sweet Chilli Chicken & Feta Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sweet Chilli Chicken & Feta Monsterito', 39100, 'Roast chicken, feta and sweet chilli sauce.', true, 36
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sweet Chilli Chicken & Feta Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken & Mayo Standard', 13800, 'Chicken and mayonnaise.', true, 37
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken & Mayo Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken & Mayo Large', 16100, 'Chicken and mayonnaise.', true, 38
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken & Mayo Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken & Mayo Monsterito', 32200, 'Chicken and mayonnaise.', true, 39
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken & Mayo Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Regina Standard', 12700, 'Ham and mushrooms.', true, 40
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Regina Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Regina Large', 17300, 'Ham and mushrooms.', true, 41
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Regina Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Regina Monsterito', 31000, 'Ham and mushrooms.', true, 42
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Regina Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Hawaiian Standard', 13800, 'Ham and pineapple.', true, 43
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Hawaiian Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Hawaiian Large', 20100, 'Ham and pineapple.', true, 44
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Hawaiian Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Hawaiian Monsterito', 33300, 'Ham and pineapple.', true, 45
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Hawaiian Monsterito');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepperoni Standard', 0, 'Our famous Margherita covered in thinly sliced pepperoni.', false, 46
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepperoni Standard');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepperoni Large', 0, 'Our famous Margherita covered in thinly sliced pepperoni.', false, 47
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepperoni Large');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepperoni Monsterito', 0, 'Our famous Margherita covered in thinly sliced pepperoni.', false, 48
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepperoni Monsterito');

  -- Extra toppings (17)
  select id into c from menu_categories where restaurant_id = r and name = 'Extra toppings';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Extra toppings', 5) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mushrooms', 3500, '', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mushrooms');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Calamata Olives', 3500, '', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Calamata Olives');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sticky BBQ', 2600, 'Sauce', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sticky BBQ');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sweet Chilli', 2600, 'Sauce', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sweet Chilli');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sweet Chilli Mayo', 2600, 'Sauce', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sweet Chilli Mayo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Assorted Peppers', 1400, '', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Assorted Peppers');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Red Onions', 1400, '', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Red Onions');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pineapple', 1400, '', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pineapple');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chorizo Sausage', 2600, '', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chorizo Sausage');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bacon', 2600, '', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bacon');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Ham', 2600, '', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Ham');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Salami', 2600, '', true, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Salami');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Deboned Pork Rib', 3500, '', true, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Deboned Pork Rib');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roast Chicken', 3500, '', true, 14
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Roast Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bolognese Mince', 3500, '', true, 15
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bolognese Mince');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mozzarella Cheese', 3500, '', true, 16
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mozzarella Cheese');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Danish Feta Cheese', 3500, '', true, 17
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Danish Feta Cheese');

end $$;

notify pgrst, 'reload schema';

-- Panarottis was seeded switched off with no menu. Now it has one.
update restaurants set active = true where name ilike '%panarotti%';
