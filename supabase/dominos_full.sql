-- Domino's Nigeria, the whole menu.
--
-- Built from the price list you exported: 70 products across six
-- sections. It supersedes dominos_menu.sql and dominos_prices.sql, and is the
-- one file to run when the menu changes.
--
-- What it does, in order: makes the six sections, brings every product to the
-- price on the list and puts it on the site, moves anything already there into
-- its right section rather than making a second copy of it, then rebuilds the
-- size and crust choices on the pizzas.
--
-- Matching is on the name with case, spaces and punctuation ignored, so an
-- item you already have as "bbq chicken" is recognised as BBQ Chicken and
-- corrected, not duplicated. A description you have written by hand is kept;
-- only an empty one is filled in.
--
-- Past orders are untouched. Each order line keeps its own copy of what was
-- ordered and what it cost, so rebuilding the choices cannot move old money.
--
-- Safe to run twice.
--
-- FOR A CLEAN START: uncomment the block below to throw the existing Domino's
-- menu away first, so nothing you added by hand survives and the sections come
-- in exactly as the export has them. Photographs go with it. Run reset.sql
-- first if there are orders, because an item that has been ordered cannot be
-- deleted while that order exists.
--
-- delete from menu_items m
-- using restaurants r
-- where m.restaurant_id = r.id and r.name ilike '%domino%';
--
-- delete from menu_categories c
-- using restaurants r
-- where c.restaurant_id = r.id and r.name ilike '%domino%';

drop table if exists dominos_import;
create temporary table dominos_import (
  category    text not null,
  name        text not null,
  alias       text not null,
  price       int  not null,
  description text not null,
  sort        int  not null
);

insert into dominos_import (category, name, alias, price, description, sort) values
  ('Pizza', 'BBQ Chicken', '', 9350, '', 1),
  ('Pizza', 'BBQ Meatball', '', 8900, '', 2),
  ('Pizza', 'BBQ Mega Meat', '', 9800, '', 3),
  ('Pizza', 'BBQ Suya Mix Grill', '', 9800, '', 4),
  ('Pizza', 'Chicken Supreme', '', 9350, '', 5),
  ('Pizza', 'Chicken Suya', '', 9350, '', 6),
  ('Pizza', 'Extravaganza', '', 9800, '', 7),
  ('Pizza', 'Half & Half', '', 8200, '', 8),
  ('Pizza', 'Margherita', '', 8600, '', 9),
  ('Pizza', 'Naija Fiesta', '', 9800, '', 10),
  ('Pizza', 'Pepperoni', '', 8900, '', 11),
  ('Pizza', 'Shawarma', '', 9800, '', 12),
  ('Pizza', 'Southern Style BBQ Chicken', '', 9350, '', 13),
  ('Pizza', 'The Lot', '', 9800, '', 14),
  ('Pizza', 'Veggie Supreme', '', 8600, '', 15),
  ('Dips & sides', 'BBQ Sauce', '', 700, '', 1),
  ('Dips & sides', 'Dip Pot Choco Fudge', '', 700, '', 2),
  ('Dips & sides', 'Hot Sweet Chilli Sauce', '', 700, '', 3),
  ('Dips & sides', 'Marinara Sauce', '', 700, '', 4),
  ('Dips & sides', 'Pepper Sauce', 'Pepper Sauce Sauce', 700, '', 5),
  ('Dips & sides', 'Shawarma Sauce', '', 700, '', 6),
  ('Dips & sides', 'Sweet Icing', '', 700, 'Dip pots', 7),
  ('Bread', 'BBQ Sauce Calzone', '', 8000, '', 1),
  ('Bread', 'Breadsticks', '', 3400, '', 2),
  ('Bread', 'Breadsticks With BBQ Sauce', '', 3400, '', 3),
  ('Bread', 'Breadsticks With Pepper Sauce', '', 3400, '', 4),
  ('Bread', 'Breadsticks With Shawarma Sauce', '', 3400, '', 5),
  ('Bread', 'Cheesy Bread', '', 4000, '', 6),
  ('Bread', 'Cheesy Chicken Suya Bread', '', 5000, '', 7),
  ('Bread', 'Cheesy Grilled Chicken Bread', '', 5000, '', 8),
  ('Bread', 'Cheesy Sausage Bread', '', 5000, '', 9),
  ('Bread', 'Cinnastix', '', 3400, '', 10),
  ('Bread', 'Pizza Sauce Calzone', '', 8000, '', 11),
  ('Bread', 'Sausage Roll Plain', '', 1900, '', 12),
  ('Bread', 'Suya Sauce Calzone', '', 8000, '', 13),
  ('Chicken & Rice', '250G Rice With 2PCS Roast Chicken', '', 6500, '', 1),
  ('Chicken & Rice', '250G Rice With 4PCS Wings', '', 6500, '', 2),
  ('Chicken & Rice', 'Chicken Wings - 4PCS', '', 4000, '', 3),
  ('Chicken & Rice', 'Chicken Wings With BBQ - 7PCS', '', 7000, 'Roasted chicken pieces with BBQ sauce', 4),
  ('Chicken & Rice', 'Chicken Wings With Pepper Sauce - 7PCS', '', 7000, 'Roasted chicken pieces with pepper sauce', 5),
  ('Chicken & Rice', 'Chicken Wings With Shawarma - 7PCS', '', 7000, 'Roasted chicken pieces with shawarma', 6),
  ('Chicken & Rice', 'Chicken Wings With Marinara - 7PCS', 'Chicken Wings With with Marinara - 7PCS', 7000, 'Roasted chicken pieces with marinara', 7),
  ('Chicken & Rice', 'Jollof Rice', '', 3000, '', 8),
  ('Chicken & Rice', 'Roasted Chicken - 2PCS', '', 4000, 'Roasted chicken 2 pieces', 9),
  ('Chicken & Rice', 'Roasted Chicken With BBQ - 5PCS', '', 9000, 'Roasted chicken pieces with BBQ sauce', 10),
  ('Chicken & Rice', 'Roasted Chicken With Pepper Sauce - 5PCS', '', 9000, 'Roasted chicken pieces with pepper sauce', 11),
  ('Chicken & Rice', 'Roasted Chicken With Shawarma - 5PCS', '', 9000, 'Roasted chicken pieces with shawarma', 12),
  ('Chicken & Rice', 'Roasted Chicken With Marinara - 5PCS', 'Roasted Chicken With with Marinara - 5PCS', 9000, 'Roasted chicken pieces with marinara', 13),
  ('Drinks', '7UP', '', 800, '500ml bottle', 1),
  ('Drinks', 'Aquafina', '', 800, '700ml bottle', 2),
  ('Drinks', 'Mirinda Orange', '', 800, '500ml bottle', 3),
  ('Drinks', 'Pepsi', '', 800, '500ml bottle', 4),
  ('Drinks', 'Pepsi Lite', '', 800, '400ml bottle', 5),
  ('Drinks', 'Supa Komando', '', 800, '300ml bottle', 6),
  ('Drinks', 'Teem Bitter Lemon', '', 800, '500ml bottle', 7),
  ('Dessert', 'Brownie', '', 3300, '', 1),
  ('Dessert', 'Cake Batter', '', 9900, '16oz tub', 2),
  ('Dessert', 'Caramel Cinnamon Bread', '', 3500, '', 3),
  ('Dessert', 'Chocolate Fudge Bread', '', 3500, '', 4),
  ('Dessert', 'Chocolate Spread Bread', '', 3500, '', 5),
  ('Dessert', 'Cookies N Cream', '', 9900, '16oz tub', 6),
  ('Dessert', 'Dark Chocolate Devotion', '', 9900, '16oz tub', 7),
  ('Dessert', 'Founders Favourite', '', 9900, '16oz tub', 8),
  ('Dessert', 'French Vanilla', '', 9900, '16oz tub', 9),
  ('Dessert', 'Melted Choco Pocket', '', 3200, '', 10),
  ('Dessert', 'Oreo Overload', '', 9900, '16oz tub', 11),
  ('Dessert', 'Strawberry', '', 9900, '16oz tub', 12),
  ('Dessert', 'To Go Chocolate Hazelnut', 'To Go Chocolate Hazlenut', 7000, '14oz tub', 13),
  ('Dessert', 'To Go Original Yoghurt', 'To Go Original Yogurt', 7000, '14oz tub', 14),
  ('Dessert', 'To Go Strawberry Yoghurt', '', 7000, '14oz tub', 15);

drop table if exists dominos_sizes;
create temporary table dominos_sizes (
  name     text not null,
  large    int  not null,
  chairman int  not null
);

insert into dominos_sizes (name, large, chairman) values
  ('BBQ Chicken', 4300, 10285),
  ('BBQ Meatball', 4225, 9580),
  ('BBQ Mega Meat', 5425, 11725),
  ('BBQ Suya Mix Grill', 5425, 11725),
  ('Chicken Supreme', 4300, 10285),
  ('Chicken Suya', 4300, 10285),
  ('Extravaganza', 5425, 11725),
  ('Half & Half', 3300, 9300),
  ('Margherita', 4210, 9775),
  ('Naija Fiesta', 5425, 11725),
  ('Pepperoni', 4225, 9580),
  ('Shawarma', 5425, 11725),
  ('Southern Style BBQ Chicken', 4300, 10285),
  ('The Lot', 5425, 11725),
  ('Veggie Supreme', 4210, 9775);

do $$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%domino%' limit 1;
  if r is null then
    raise exception 'No Domino''''s restaurant found. Add it in admin first.';
  end if;

  -- The six sections.
  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Pizza', 1), ('Bread', 2), ('Chicken & Rice', 3),
    ('Dips & sides', 4), ('Drinks', 5), ('Dessert', 6)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories
    where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Pizza', 1), ('Bread', 2), ('Chicken & Rice', 3),
    ('Dips & sides', 4), ('Drinks', 5), ('Dessert', 6)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  -- Anything already on the menu: corrected, priced and put in its section.
  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when m.description <> '' then m.description else i.description end,
      available   = true,
      sort_order  = i.sort,
      category_id = c.id
  from dominos_import i
       join menu_categories c
         on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) in (
      upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')),
      coalesce(nullif(upper(regexp_replace(i.alias, '[^a-zA-Z0-9]', '', 'g')), ''),
               upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')))
    );
  get diagnostics moved = row_count;

  -- Anything not on the menu yet.
  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, true, i.sort
  from dominos_import i
       join menu_categories c
         on c.restaurant_id = r and c.name = i.category
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

  raise notice '% products corrected, % added.', moved, added;

  -- A size the shop only makes in one crust. Added to whatever the item
  -- already says rather than replacing it, and only once however often this
  -- file is run.
  update menu_items m
  set description = case
        when m.description = '' then n.note
        else m.description || '. ' || n.note
      end
  from (values
  ('Half & Half', 'Chairman 16" is thin crust only'),
  ('The Lot', 'Chairman 16" is hand tossed only')
  ) as n(name, note)
  where m.restaurant_id = r
    and m.name = n.name
    and position(n.note in m.description) = 0;

  -- Pizza size and crust, rebuilt from the list. Deleting a choice cannot
  -- disturb an order: order lines carry their own copy of the wording and the
  -- money, and their link to the choice is allowed to go quiet.
  delete from item_option_groups g
  using menu_items m, dominos_sizes s
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and m.name = s.name
    and g.name in ('Size', 'Crust');

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select m.id, 'Size', true, 1, 1
  from menu_items m join dominos_sizes s on s.name = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, v.label, v.delta, v.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join dominos_sizes s on s.name = m.name
       cross join lateral (values
         ('Medium 12"', 0, 1),
         ('Large 14"', s.large, 2),
         ('Chairman 16"', s.chairman, 3)
       ) as v(label, delta, sort)
  where m.restaurant_id = r and g.name = 'Size';

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select m.id, 'Crust', true, 1, 2
  from menu_items m join dominos_sizes s on s.name = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, v.label, 0, v.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join dominos_sizes s on s.name = m.name
       cross join lateral (values ('Hand Tossed', 1), ('Thin Crust', 2)) as v(label, sort)
  where m.restaurant_id = r and g.name = 'Crust';

  -- The old sections, now that everything has moved out of them.
  delete from menu_categories c
  where c.restaurant_id = r
    and c.name in ('Pizza · Veggie', 'Pizza · Beef', 'Pizza · Chicken',
                   'Pizza · Loaded', 'Pizza · Other', 'Breads', 'Chicken', 'Extras')
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $$;

-- Anything of yours the price list did not mention: check these by hand, they
-- are either off the menu now or named differently from the export.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%domino%'
  and not exists (
    select 1 from dominos_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) in (
      upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')),
      coalesce(nullif(upper(regexp_replace(i.alias, '[^a-zA-Z0-9]', '', 'g')), ''),
               upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g')))
    )
  )
order by c.sort_order, m.sort_order;

-- The finished menu: 70 rows, every one priced and on the site.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%domino%'
order by c.sort_order, m.sort_order;
