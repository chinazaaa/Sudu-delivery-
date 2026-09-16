-- Domino's Pizza menu, as listed publicly.
-- 50 items in 9 categories, 0 of them priced.
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
  select id into r from restaurants where name ilike '%Domino''s%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active, sort_order)
    values ('Domino''s Pizza', 'KM 34 Lekki-Epe Expy, Emperor Estate', time '22:00', true, 10)
    returning id into r;
  end if;

  -- Pizza · Veggie (2)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizza · Veggie';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizza · Veggie', 1) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Margherita', 0, 'Tomato Sauce & Extra Mozzarella Cheese', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Margherita');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Veggie Supreme', 0, 'Green Peppers, Fresh Onions, with Tomato Sauce & Mozzarella Cheese', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Veggie Supreme');

  -- Pizza · Beef (2)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizza · Beef';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizza · Beef', 2) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepperoni', 0, 'Beef Pepperoni, Tomato Sauce & Mozzarella Cheese', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepperoni');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Meatball', 0, 'Meatball with BBQ Sauce & Mozzarella Cheese', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Meatball');

  -- Pizza · Chicken (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizza · Chicken';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizza · Chicken', 3) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Supreme', 0, 'Grilled Chicken, Sweet Corn, Green Peppers & Fresh Onions, with Tomato Sauce & Mozzarella Cheese', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Supreme');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Chicken', 0, 'Grilled Chicken & Fresh Onions, with BBQ Sauce & Mozzarella Cheese', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Suya', 0, 'Chicken Suya, Green Peppers, Nigerian Hot Chili Peppers & Fresh Onions, with Suya infused Tomato Sauce & Mozzarella Cheese', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Suya');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Southern Style BBQ Chicken', 0, 'Grilled Chicken, Sweet Corn, with Tomato Sauce, Extra BBQ sauce & Mozzarella Cheese', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Southern Style BBQ Chicken');

  -- Pizza · Loaded (6)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizza · Loaded';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizza · Loaded', 4) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Naija Fiesta', 0, 'Thousand Island Sauce, Meatballs, BBQ Base, Red Chilli, Chicken & Onions', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Naija Fiesta');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Suya Mix Grill', 0, 'Beef Suya, Hotdog, Pepper Chicken, Red Chilli, Suya Spice, BBQ Sauce.', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Suya Mix Grill');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Shawarma', 0, 'BBQ Sauce, Mozzarella Cheese, Red Chili, Onions, Grilled Chicken and Smoked Sausage', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Shawarma');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Extravaganza', 0, 'Green pepper, Sweet Corn, Beef Suya, Smoked Sausage, Pepperoni, Onions & Pizza Sauce', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Extravaganza');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Mega Meat', 0, 'BBQ Sauce, Mozzarella Cheese, Beef Pepperoni, Grilled Chicken, Smoked Sausage and Meatballs', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Mega Meat');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'The Lot', 0, '', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'The Lot');

  -- Pizza · Other (1)
  select id into c from menu_categories where restaurant_id = r and name = 'Pizza · Other';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Pizza · Other', 5) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Half & Half', 0, 'Any half & half pizza flavours of your choice', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Half & Half');

  -- Breads (13)
  select id into c from menu_categories where restaurant_id = r and name = 'Breads';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Breads', 6) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Breadsticks', 0, 'Hot & fresh oven-baked Breadsticks', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Breadsticks');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cinnastix', 0, 'Hot & fresh oven-baked Cinnamon Breadsticks', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cinnastix');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cheesy Bread', 0, 'Hot & fresh oven-baked Breadsticks topped with Mozzarella Cheese', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cheesy Bread');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Sausage Roll Plain', 0, 'Baked with YOU in mind, you get the best deal when you buy our tasty Sausage Rolls.', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Sausage Roll Plain');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Breadsticks With Pepper Sauce', 0, '', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Breadsticks With Pepper Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Breadsticks With Shawarma Sauce', 0, '', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Breadsticks With Shawarma Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Breadsticks With BBQ Sauce', 0, '', false, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Breadsticks With BBQ Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cheesy Grilled Chicken Bread', 0, '', false, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cheesy Grilled Chicken Bread');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cheesy Sausage Bread', 0, '', false, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cheesy Sausage Bread');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cheesy Chicken Suya Bread', 0, '', false, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cheesy Chicken Suya Bread');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Sauce Calzone', 0, '', false, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Sauce Calzone');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pizza Sauce Calzone', 0, '', false, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pizza Sauce Calzone');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Suya Sauce Calzone', 0, '', false, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Suya Sauce Calzone');

  -- Chicken (9)
  select id into c from menu_categories where restaurant_id = r and name = 'Chicken';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Chicken', 7) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Jollof Rice', 0, '', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Jollof Rice');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roasted Chicken - 2PCS', 0, 'Roasted chicken only. no dip pot sauce added', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Roasted Chicken - 2PCS');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '250G Rice With 2PCS Roast Chicken', 0, '', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = '250G Rice With 2PCS Roast Chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '250G Rice With 4PCS Wings', 0, '', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = '250G Rice With 4PCS Wings');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roasted Chicken With Pepper Sauce - 5PCS', 0, 'Roasted chicken with pepper sauce dip pot', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Roasted Chicken With Pepper Sauce - 5PCS');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roasted Chicken With Shawarma - 5PCS', 0, 'Roasted chicken with shawarma sauce dip pot', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Roasted Chicken With Shawarma - 5PCS');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Wings With Pepper Sauce - 7PCS', 0, 'Chicken wings with pepper sauce dip pot', false, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Wings With Pepper Sauce - 7PCS');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Wings With Shawarma - 7PCS', 0, 'Chicken wings with shawarma sauce dip pot', false, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Wings With Shawarma - 7PCS');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Wings - 4PCS', 0, 'Chicken wings only. no dip pot sauce added', false, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Chicken Wings - 4PCS');

  -- Extras (6)
  select id into c from menu_categories where restaurant_id = r and name = 'Extras';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Extras', 8) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'BBQ Sauce', 0, 'BBQ Dipping Sauce', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'BBQ Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Marinara Sauce', 0, 'Tomato Marinara Dipping Sauce.', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Marinara Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Shawarma Sauce', 0, 'Shawarma Dipping Sauce', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Shawarma Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepper Sauce Sauce', 0, '', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepper Sauce Sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Dip Pot Choco Fudge', 0, '', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Dip Pot Choco Fudge');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Hot Sweet Chilli Sauce', 0, '', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Hot Sweet Chilli Sauce');

  -- Drinks (7)
  select id into c from menu_categories where restaurant_id = r and name = 'Drinks';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Drinks', 9) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Aquafina', 0, '', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Aquafina');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepsi Lite', 0, '', false, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepsi Lite');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '7UP', 0, '', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = '7UP');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepsi', 0, '', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepsi');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Mirinda Orange', 0, '', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Mirinda Orange');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Teem Bitter Lemon', 0, '', false, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Teem Bitter Lemon');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Supa Komando', 0, '', false, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Supa Komando');

end $$;

notify pgrst, 'reload schema';

-- Placeholder pizzas from the original seed, hidden now the real menu is here.
update menu_items set available = false
where name in ('Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
               'Chicken wings (6)', 'Garlic bread', 'Classic pizza')
  and restaurant_id in (select id from restaurants where name ilike '%domino%');
