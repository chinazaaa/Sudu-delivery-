-- Panarottis Novare, the whole menu.
--
-- Built from the price list you exported: 52 products across six
-- sections. It supersedes panarottis_menu.sql and is the one file to run when
-- the menu changes.
--
-- THE PIZZAS NOW CARRY A SIZE CHOICE. The menu used to list Carnivore
-- Standard, Carnivore Large and Carnivore Monsterito as three separate
-- products, fifty-one rows for seventeen pizzas. Each is now one product with
-- Standard, Large and Monsterito as a choice, priced from the list, the way
-- the Dominos pizzas already work. The counter sheet reads 2 x Carnivore
-- (Large). The old Large and Monsterito rows are removed, and any photograph
-- on one of them goes with it, so photograph the base product instead.
--
-- 11 products the export marks out of stock go in switched off. They will
-- read "Sold out today" on the menu until you turn them on in Admin, Menu.
--
-- The export lists a second Carnivore, out of stock and described unlike the
-- pizza, sitting among the pizza folds. It is called Carnivore Pizza Fold
-- here so it does not collide with the pizza. Rename it in admin if that
-- reading is wrong.
--
-- Safe to run twice.

drop table if exists pan_import;
create table pan_import (
  category    text    not null,
  name        text    not null,
  alias       text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

drop table if exists pan_sizes;
create table pan_sizes (
  name       text not null,
  large      int  not null,
  monsterito int
);

drop table if exists pan_retired;
create table pan_retired (name text not null);

insert into pan_import (category, name, alias, price, available, description, sort) values ('Starters', 'Flatbread', 'Flatbread Standard', 2900, true, 'Garlic or herb flatbread baked to perfection.', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Starters', 'Three Cheese', 'Three Cheese Standard', 8700, true, 'Flatbread topped with mozzarella, Cheddar and feta cheese.', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Alfredo', '', 15000, true, 'Crispy bacon, ham and brown mushrooms in a rich, cream-based sauce.', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Chorizo Pasta Danielle', '', 15000, true, 'With or without olives. Chorizo sausage, brown mushrooms and sautéed onions in a creamy tomato-based sauce.', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Chicken Capricciosa', '', 11500, true, 'Oven-roasted chicken, assorted peppers and brown mushrooms in a cream-based sauce.', 3);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Chicken Milano', '', 15000, true, 'Chicken breasts, sautéed with brown mushrooms, onions and assorted peppers, combined in a creamy sauce, served on a bed of fettuccine and layered with Cheddar cheese.', 4);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Spaghetti Bolognese', '', 0, false, 'Traditional ground beef in a tomato-based sauce.', 5);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Spaghetti & Meatballs', '', 0, false, 'Spaghetti and meatballs in a tomato-based sauce with basil, oregano and garlic.', 6);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pastas', 'Carne', '', 15500, true, 'Crispy bacon, chorizo sausage, salami, onions and assorted peppers, sautéed and combined in a creamy tomato-based sauce.', 7);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Salad', 'Greek Salad', '', 16700, true, 'Garden salad with feta and Calamata olives.', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Salad', 'Chicken Caesar Salad', '', 14400, true, 'Garden salad with bacon, mushrooms and roast chicken.', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Duo Pizza', 'Duo Pizza Standard', 16700, true, 'Combination of your two favorite pizzas in one delicious duo , meat supreme , chicken supreme , margarita , carnivore .', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Saucy Meat Supreme', 'Saucy Meat Supreme Standard', 16100, true, 'Bacon, ham, chorizo sausage and bolognese mince, drizzled in our cheesy BBQ sauce.', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Carnivore', 'Carnivore Standard', 15500, true, 'Salami, chorizo sausage, bacon and ham.', 3);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Panarottis Special', 'Panarottis Special Standard', 19000, true, 'Salami, ham, mushrooms, pineapple and Calamata olives.', 4);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Chicken Mexicana', 'Chicken Mexicana Standard', 13800, true, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', 5);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Mexicana', 'Mexicana Standard', 15000, true, 'Bolognese mince, cherry tomatoes, assorted peppers, red onions and garlic.', 6);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Rib & Chicken', 'Rib & Chicken Standard', 13800, true, 'Deboned pork ribs marinated in our sticky BBQ basting, roast chicken and cherry tomatoes.', 7);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Salami & Chorizo', 'Salami & Chorizo Standard', 13800, true, 'Salami & Chorizo.', 8);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Saucy Chicken Supreme', 'Saucy Chicken Supreme Standard', 16100, true, 'Roast chicken, bacon and ham, drizzled in our sweet chilli mayo.', 9);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Sweet Chilli Chicken & Feta', 'Sweet Chilli Chicken & Feta Standard', 17300, true, 'Roast chicken, feta and sweet chilli sauce.', 10);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Saucy Chicken & Mushroom', 'Saucy Chicken & Mushroom Standard', 13300, true, 'Roast chicken and mushrooms, drizzled in a sweet chilli mayo.', 11);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Chicken & Mayo', 'Chicken & Mayo Standard', 13800, true, 'Chicken and mayonnaise.', 12);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Hawaiian', 'Hawaiian Standard', 13800, true, 'Ham and pineapple.', 13);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Regina', 'Regina Standard', 12700, true, 'Ham and mushrooms.', 14);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Vegetarian', 'Vegetarian Standard', 17300, true, 'Cherry tomatoes, onions, assorted peppers, mushrooms and pineapple.', 15);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizzas', 'Pepperoni', 'Pepperoni Standard', 0, false, 'Our famous Margherita covered in thinly sliced pepperoni.', 16);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizza folds', 'Saucy Chicken', '', 0, false, 'Roast chicken, tikka, BBQ or peri-peri sauce, assorted peppers, red onions and mozzarella cheese.', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizza folds', 'Pepperoni Pizza Fold', '', 0, false, 'Pepperoni Pizza Fold', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizza folds', 'Carnivore Pizza Fold', '', 0, false, 'Ham, salami, chorizo sausage, Italian tomato sauce and mozzarella cheese', 3);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizza folds', 'Saucy Meat Supreme Pizza Fold', '', 0, false, 'Saucy Meat Supreme Pizza Fold', 4);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Pizza folds', 'Salami & Chorizo Pizza Fold', '', 0, false, 'Salami & Chorizo Pizza Fold', 5);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Mushrooms', '', 3500, true, '', 1);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Calamata Olives', '', 3500, true, '', 2);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Sweet Chilli', '', 2600, true, '', 3);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Sticky BBQ', '', 2600, true, '', 4);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Sweet Chilli mayo', '', 2600, true, '', 5);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Assorted peppers', '', 1400, true, '', 6);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Danish Feta Cheese', '', 3500, true, '', 7);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Red Onions', '', 1400, true, '', 8);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Cheddar Cheese', '', 0, false, '', 9);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Mozzarella Cheese', '', 3500, true, '', 10);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Ham', '', 2600, true, '', 11);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Gherkins', '', 0, false, '', 12);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Pineapple', '', 1400, true, '', 13);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Bolognese mince', '', 3500, true, '', 14);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Salami', '', 2600, true, '', 15);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Roast Chicken', '', 3500, true, '', 16);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Chorizo Sausage', '', 2600, true, '', 17);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Steak Strips', '', 0, false, '', 18);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Deboned pork rib', '', 3500, true, '', 19);
insert into pan_import (category, name, alias, price, available, description, sort) values ('Extra toppings', 'Bacon', '', 2600, true, '', 20);

insert into pan_sizes (name, large, monsterito) values ('Flatbread', 800, null);
insert into pan_sizes (name, large, monsterito) values ('Three Cheese', 5100, null);
insert into pan_sizes (name, large, monsterito) values ('Duo Pizza', 8600, 23500);
insert into pan_sizes (name, large, monsterito) values ('Saucy Meat Supreme', 8600, 23600);
insert into pan_sizes (name, large, monsterito) values ('Carnivore', 6400, 21900);
insert into pan_sizes (name, large, monsterito) values ('Panarottis Special', 5700, 23500);
insert into pan_sizes (name, large, monsterito) values ('Chicken Mexicana', 6900, 22400);
insert into pan_sizes (name, large, monsterito) values ('Mexicana', 5700, 21200);
insert into pan_sizes (name, large, monsterito) values ('Rib & Chicken', 5200, 16100);
insert into pan_sizes (name, large, monsterito) values ('Salami & Chorizo', 5800, 16100);
insert into pan_sizes (name, large, monsterito) values ('Saucy Chicken Supreme', 8600, 23000);
insert into pan_sizes (name, large, monsterito) values ('Sweet Chilli Chicken & Feta', 8000, 21800);
insert into pan_sizes (name, large, monsterito) values ('Saucy Chicken & Mushroom', 5100, 21200);
insert into pan_sizes (name, large, monsterito) values ('Chicken & Mayo', 2300, 18400);
insert into pan_sizes (name, large, monsterito) values ('Hawaiian', 6300, 19500);
insert into pan_sizes (name, large, monsterito) values ('Regina', 4600, 18300);
insert into pan_sizes (name, large, monsterito) values ('Vegetarian', 2800, 12600);
insert into pan_sizes (name, large, monsterito) values ('Pepperoni', 0, 0);

insert into pan_retired (name) values ('Flatbread Large');
insert into pan_retired (name) values ('Three Cheese Large');
insert into pan_retired (name) values ('Duo Pizza Large');
insert into pan_retired (name) values ('Duo Pizza Monsterito');
insert into pan_retired (name) values ('Saucy Meat Supreme Large');
insert into pan_retired (name) values ('Saucy Meat Supreme Monsterito');
insert into pan_retired (name) values ('Carnivore Large');
insert into pan_retired (name) values ('Carnivore Monsterito');
insert into pan_retired (name) values ('Panarottis Special Large');
insert into pan_retired (name) values ('Panarottis Special Monsterito');
insert into pan_retired (name) values ('Chicken Mexicana Large');
insert into pan_retired (name) values ('Chicken Mexicana Monsterito');
insert into pan_retired (name) values ('Mexicana Large');
insert into pan_retired (name) values ('Mexicana Monsterito');
insert into pan_retired (name) values ('Rib & Chicken Large');
insert into pan_retired (name) values ('Rib & Chicken Monsterito');
insert into pan_retired (name) values ('Salami & Chorizo Large');
insert into pan_retired (name) values ('Salami & Chorizo Monsterito');
insert into pan_retired (name) values ('Saucy Chicken Supreme Large');
insert into pan_retired (name) values ('Saucy Chicken Supreme Monsterito');
insert into pan_retired (name) values ('Sweet Chilli Chicken & Feta Large');
insert into pan_retired (name) values ('Sweet Chilli Chicken & Feta Monsterito');
insert into pan_retired (name) values ('Saucy Chicken & Mushroom Large');
insert into pan_retired (name) values ('Saucy Chicken & Mushroom Monsterito');
insert into pan_retired (name) values ('Chicken & Mayo Large');
insert into pan_retired (name) values ('Chicken & Mayo Monsterito');
insert into pan_retired (name) values ('Hawaiian Large');
insert into pan_retired (name) values ('Hawaiian Monsterito');
insert into pan_retired (name) values ('Regina Large');
insert into pan_retired (name) values ('Regina Monsterito');
insert into pan_retired (name) values ('Vegetarian Large');
insert into pan_retired (name) values ('Vegetarian Monsterito');
insert into pan_retired (name) values ('Pepperoni Large');
insert into pan_retired (name) values ('Pepperoni Monsterito');

do $panarottis$
declare
  r uuid;
  moved int;
  added int;
  gone int;
begin
  select id into r from restaurants where name ilike '%panarotti%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Panarottis Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Starters', 1),
    ('Pastas', 2),
    ('Salad', 3),
    ('Pizzas', 4),
    ('Pizza folds', 5),
    ('Extra toppings', 6)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Starters', 1),
    ('Pastas', 2),
    ('Salad', 3),
    ('Pizzas', 4),
    ('Pizza folds', 5),
    ('Extra toppings', 6)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  -- Already on the menu: the Standard row becomes the product itself.
  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from pan_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) in (
      upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')),
      coalesce(nullif(upper(regexp_replace(i.alias, '[^a-zA-Z0-9]', '', 'g')), ''),
               upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')))
    );
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from pan_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) in (
        upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')),
        coalesce(nullif(upper(regexp_replace(i.alias, '[^a-zA-Z0-9]', '', 'g')), ''),
                 upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')))
      )
  );
  get diagnostics added = row_count;

  -- The old per-size rows. One that has been ordered is kept and switched off
  -- instead, since an order has to keep pointing at what was ordered.
  update menu_items m set available = false
  from pan_retired t
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(t.name, '[^a-zA-Z0-9]', '', 'g'))
    and exists (select 1 from order_items oi where oi.menu_item_id = m.id);

  delete from menu_items m
  using pan_retired t
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(t.name, '[^a-zA-Z0-9]', '', 'g'))
    and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);
  get diagnostics gone = row_count;

  raise notice '% products corrected, % added, % per-size rows retired.', moved, added, gone;

  -- Size, rebuilt from the list. Deleting a choice cannot disturb an order:
  -- order lines carry their own copy of the wording and the money.
  delete from item_option_groups g
  using menu_items m, pan_sizes s
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and m.name = s.name
    and g.name = 'Size';

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select m.id, 'Size', true, 1, 1
  from menu_items m join pan_sizes s on s.name = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, v.label, v.delta, v.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join pan_sizes s on s.name = m.name
       cross join lateral (values
         ('Standard', 0, 1),
         ('Large', s.large, 2),
         ('Monsterito', coalesce(s.monsterito, 0), 3)
       ) as v(label, delta, sort)
  where m.restaurant_id = r
    and g.name = 'Size'
    and (v.label <> 'Monsterito' or s.monsterito is not null);

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $panarottis$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%panarotti%'
  and not exists (
    select 1 from pan_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) in (
      upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')),
      coalesce(nullif(upper(regexp_replace(i.alias, '[^a-zA-Z0-9]', '', 'g')), ''),
               upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')))
    )
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%panarotti%'
order by c.sort_order, m.sort_order;

drop table if exists pan_import;
drop table if exists pan_sizes;
drop table if exists pan_retired;
