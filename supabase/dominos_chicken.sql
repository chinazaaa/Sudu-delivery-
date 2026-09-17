-- Domino's chicken and rice: the four that were never seeded, and prices for
-- the nine that were.
--
-- The whole Chicken section went in at zero naira and unavailable, and the
-- pricing file only ever covered the pizzas, so none of it has been showing on
-- the site. This fills the gap.
--
-- Safe to run twice.

do $$
declare
  r uuid;
  c uuid;
begin
  select id into r from restaurants where name ilike '%domino%' limit 1;
  if r is null then
    raise notice 'No Domino''s restaurant found; nothing to do.';
    return;
  end if;

  select id into c from menu_categories where restaurant_id = r and name = 'Chicken';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order)
    values (r, 'Chicken', 7) returning id into c;
  end if;

  -- The four missing sauces: marinara and BBQ, on both the roast and the wings.
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roasted Chicken With Marinara - 5PCS', 9000,
         'Roasted chicken with marinara sauce dip pot', true, 7
  where not exists (select 1 from menu_items
                    where restaurant_id = r and name = 'Roasted Chicken With Marinara - 5PCS');

  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Roasted Chicken With BBQ - 5PCS', 9000,
         'Roasted chicken with BBQ sauce dip pot', true, 8
  where not exists (select 1 from menu_items
                    where restaurant_id = r and name = 'Roasted Chicken With BBQ - 5PCS');

  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Wings With Marinara - 7PCS', 7000,
         'Chicken wings with marinara sauce dip pot', true, 11
  where not exists (select 1 from menu_items
                    where restaurant_id = r and name = 'Chicken Wings With Marinara - 7PCS');

  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Chicken Wings With BBQ - 7PCS', 7000,
         'Chicken wings with BBQ sauce dip pot', true, 12
  where not exists (select 1 from menu_items
                    where restaurant_id = r and name = 'Chicken Wings With BBQ - 7PCS');
end $$;

-- Prices, and on to the site. Named one by one rather than by category, so a
-- hand-made item in Chicken is never quietly repriced.
update menu_items m set price_food = v.price, available = true
from restaurants r,
     (values ('Jollof Rice', 3000),
             ('Roasted Chicken - 2PCS', 4000),
             ('250G Rice With 2PCS Roast Chicken', 6500),
             ('250G Rice With 4PCS Wings', 6500),
             ('Roasted Chicken With Pepper Sauce - 5PCS', 9000),
             ('Roasted Chicken With Shawarma - 5PCS', 9000),
             ('Roasted Chicken With Marinara - 5PCS', 9000),
             ('Roasted Chicken With BBQ - 5PCS', 9000),
             ('Chicken Wings With Pepper Sauce - 7PCS', 7000),
             ('Chicken Wings With Shawarma - 7PCS', 7000),
             ('Chicken Wings With Marinara - 7PCS', 7000),
             ('Chicken Wings With BBQ - 7PCS', 7000),
             ('Chicken Wings - 4PCS', 4000)
     ) as v(name, price)
where m.restaurant_id = r.id
  and r.name ilike '%domino%'
  and m.name = v.name;

-- Sort order, so the menu reads the way the shop lists it.
update menu_items m set sort_order = v.sort
from restaurants r,
     (values ('Jollof Rice', 1),
             ('Roasted Chicken - 2PCS', 2),
             ('250G Rice With 2PCS Roast Chicken', 3),
             ('250G Rice With 4PCS Wings', 4),
             ('Roasted Chicken With Pepper Sauce - 5PCS', 5),
             ('Roasted Chicken With Shawarma - 5PCS', 6),
             ('Roasted Chicken With Marinara - 5PCS', 7),
             ('Roasted Chicken With BBQ - 5PCS', 8),
             ('Chicken Wings With Pepper Sauce - 7PCS', 9),
             ('Chicken Wings With Shawarma - 7PCS', 10),
             ('Chicken Wings With Marinara - 7PCS', 11),
             ('Chicken Wings With BBQ - 7PCS', 12),
             ('Chicken Wings - 4PCS', 13)
     ) as v(name, sort)
where m.restaurant_id = r.id
  and r.name ilike '%domino%'
  and m.name = v.name;

-- What you should see afterwards: thirteen rows, all priced, all available.
select m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%domino%' and c.name = 'Chicken'
order by m.sort_order;
