-- Cold Stone Creamery Novare, the whole menu.
--
-- Built from the price list you exported: 65 products across seven
-- sections, from 66 rows. Nothing of this menu existed before, so
-- everything here is new.
--
-- The export gives no sections, so these are worked out from what each
-- product costs and how it is described. A signature creation and a scoop of
-- ice cream read alike in a list, but one is 7,200 and the other 4,320, and a
-- deal is written as an instruction rather than as a description. Move
-- anything filed oddly in Admin, Menu.
--
-- Cake Batter N Shake is the one product the export lists in two sizes, so it
-- carries a Like It and a Love It choice rather than appearing twice.
--
-- 7 products go in switched off: what the export marks out of stock, and
-- anything it prices at nothing, which would otherwise be orderable free.
--
-- Safe to run twice.

drop table if exists cs_import;
create table cs_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

drop table if exists cs_sizes;
create table cs_sizes (
  item  text not null,
  label text not null,
  delta int  not null,
  sort  int  not null
);

insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'THE PIE WHO LOVED ME®', 7200, true, 'Cheesecake Ice Cream with Fudge, Graham Cracker Pie Crust and OREO®', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'STRAWBERRY BANANA RENDEZVOUS®', 7200, true, 'Strawberry Ice Cream with Strawberry, Graham Cracker Pie Crust, White Chocolate Chip and Banana', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'Cookies and Cream', 7200, true, 'Cookies and Cream', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'Sweet Cream Baileys', 7200, true, 'Sweet Cream Baileys', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'MINT MINT CHOCOLATE CHOCOLATE CHIP', 7200, true, 'Mint Ice Cream with Fudge, Chocolate Chip and Brownie.', 5);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'COOKIE DOUGHN’T YOU WANT SOME', 7200, true, 'French Vanilla Ice Cream with Caramel, Fudge, Chocolate Chip and Cookie Dough.', 6);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'AMERICONE', 7200, true, 'AMERICONE', 7);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'BIRTHDAY CAKE REMIX', 7200, true, 'Cake Batter Ice Cream with Fudge, Rainbow Sprinkle and Brownie.', 8);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'CHOCO MUDPIE', 7200, true, 'CHOCO MUDPIE', 9);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'Coffee Lovers Only', 7200, true, 'Coffee Ice Cream with Caramel, Roasted Almond and Health® Bar.', 10);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'BANANA CARAMEL CRUNCH', 7200, true, 'French Vanilla Ice Cream with Caramel, Roasted Almond and Banana.', 11);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'ALL LOVIN’ NO OVEN', 7200, true, 'Cake Batter Ice Cream with Fudge, Cookie Dough and Whipped Topping', 12);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'OREO® OVERLOAD', 7200, true, 'Sweet Cream Ice Cream with Fudge, Chocolate Chip and OREO®', 13);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'PEANUT BUTTER CUP PERFECTION', 7200, true, 'Chocolate Ice Cream with Fudge, Peanut Butter and Reese’s® PB Cup', 14);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'THAT’S HOW I ROLL®', 7200, true, 'Cake Batter Ice Cream with Cinnamon, Almond and Yellow Cake', 15);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'CHEESECAKE FANTASY', 7200, true, 'Cheesecake Ice Cream with Blueberry, Strawberry and Graham Cracker Pie Crust.', 16);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'SURRENDER TO STRAWBERRY®', 7200, true, 'Strawberry Ice Cream with Strawberries, Whipped Toppings, and Yellow cake.', 17);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'GERMANCHOKOLATEKAKE', 7200, true, 'Chocolate Ice Cream with Caramel, Almond, Coconut and Brownie.', 18);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'Chocolate Devotion', 7200, true, 'Chocolate Ice Cream with Chocolate Chip, Brownie and Fudge', 19);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'FOUNDER’S FAVORITE', 7200, true, 'Sweet Cream Ice Cream with Fudge, Caramel, Almond and Brownie.', 20);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'COOKIE MINTSTER', 7200, true, 'Mint Ice Cream with Fudge and OREO', 21);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'OUR STRAWBERRY BLONDE®', 7200, true, 'Strawberry Ice Cream with Caramel, Whipped Topping, Strawberry, and Graham Cracker Pie Crust.', 22);
insert into cs_import (category, name, price, available, description, sort) values ('Signature creations', 'BERRY BERRY BERRY GOOD', 7200, true, 'Sweet Cream Ice Cream with Blueberry, Raspberry and Strawberry.', 23);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Sweet Cream Ice Cream', 0, false, 'Sweet Cream Ice Cream', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Strawberry Ice Cream', 4320, true, 'Strawberry Ice Cream', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Coffee Ice Cream', 0, false, 'Coffee Ice Cream', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'French Vanilla Ice Cream', 4320, true, 'French Vanilla Ice Cream', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Cake Batter Ice Cream', 4320, true, 'Cake Batter Ice Cream', 5);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Cotton Candy Ice Cream', 4320, true, 'Cotton Candy Ice Cream', 6);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Mint Ice Cream', 4320, true, 'Mint Ice Cream', 7);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Chocolate Ice Cream', 4320, true, 'Chocolate Ice Cream', 8);
insert into cs_import (category, name, price, available, description, sort) values ('Ice cream by the scoop', 'Sweet Banana Cream', 0, false, 'Sweet Banana Cream', 9);
insert into cs_import (category, name, price, available, description, sort) values ('Shakes', 'Cake Batter N'' Shake', 7200, true, 'Milk, Cake Batter Ice Cream, Yellow Cake and Whipped Topping', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Shakes', 'Crème De Menthe', 7200, true, 'Milk, Mint Ice Cream, Chocolate Shavings, Whipped Topping', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Shakes', 'Oh Fudge', 7200, true, 'Milk, Chocolate, Chocolate Ice Cream and Fudge', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Shakes', 'Savory Strawberry', 7200, true, 'Milk, Strawberry Ice Cream, Strawberry', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Waffles', 'Plain Waffle', 0, false, 'Plain Waffle', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Waffles', 'Coated Waffle', 1560, true, 'Plain Waffle dipped in White/Dark Chocolate, coated with Rainbow Sprinkles or Coconut Shavings', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Waffles', 'Dipped Waffle', 1320, true, 'Plain Waffle dipped in White/Dark Chocolate', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Strawberry', 1680, true, 'Strawberry', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Twix', 1320, true, 'Twix Chocolate', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Snickers', 1320, true, 'Snickers', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'White Chocolate Chips', 1680, true, 'White Chocolate Chips', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Peanut Butter', 1320, true, 'Peanut Butter', 5);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Raspberry', 1680, true, 'Raspberry', 6);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'M&M', 1320, true, 'M&M Chocolate', 7);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Rainbow Sprinkles', 1320, true, 'Rainbow Sprinkles', 8);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Dark Chocolate Chips', 1680, true, 'Dark Chocolate Chips', 9);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Cashew Nut', 960, true, 'Cashew Nut', 10);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Brownie', 1320, true, 'Brownie', 11);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Gummy Bear', 1920, true, 'Gummy Bear', 12);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Almond', 0, false, 'Almond', 13);
insert into cs_import (category, name, price, available, description, sort) values ('Mix-ins & toppings', 'Hennessey', 0, false, 'Hennessey', 14);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', '7up 500ml', 960, true, 'A crisp lemon-lime flavored soft drink, light and refreshing.', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', 'Super Komando', 840, true, 'An energy drink designed to boost energy and alertness.', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', 'Pepsi 500ML', 960, true, 'A classic cola soft drink with a bold, refreshing taste.', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', 'Mirinda 500ml', 960, true, 'A refreshing orange-flavored carbonated soft drink with a sweet citrus taste.', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', 'Water 750ML', 600, true, 'Pure bottled drinking water for refreshment and hydration.', 5);
insert into cs_import (category, name, price, available, description, sort) values ('Drinks', 'Teem Bitter Lemon 500ml', 960, true, 'A tangy bitter lemon soft drink with a sharp citrus flavor.', 6);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'Creamy Chowster', 8200, true, 'Buy 1 Love It RTL cup + 1 Plain Waffle for N5000', 1);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'SCOOP N SAVE', 6300, true, 'BUY 1 LOVE IT CYO & 1 PLAIN WAFFLE FOR 4700', 2);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'Cold Stone Cool Shakes', 0, false, 'Get 25% off a Like It Milkshake', 3);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'Diary Room Delight', 5900, true, 'Get 14% off Gotta have it cup', 4);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'BOGOF Thursdays', 11800, true, 'Buy 1 Love it cup and Get same size FREE', 5);
insert into cs_import (category, name, price, available, description, sort) values ('Deals', 'Everybody Loves Coldstone', 21200, true, 'Get 20% off Everybody CYO', 6);

insert into cs_sizes (item, label, delta, sort) values ('Cake Batter N'' Shake', 'Like It', 0, 1);
insert into cs_sizes (item, label, delta, sort) values ('Cake Batter N'' Shake', 'Love It', 3000, 2);

do $coldstone$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%cold stone%'
      or name ilike '%coldstone%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Cold Stone Creamery Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Signature creations', 1),
    ('Ice cream by the scoop', 2),
    ('Shakes', 3),
    ('Waffles', 4),
    ('Mix-ins & toppings', 5),
    ('Drinks', 6),
    ('Deals', 7)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Signature creations', 1),
    ('Ice cream by the scoop', 2),
    ('Shakes', 3),
    ('Waffles', 4),
    ('Mix-ins & toppings', 5),
    ('Drinks', 6),
    ('Deals', 7)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from cs_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from cs_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  );
  get diagnostics added = row_count;

  raise notice '% products corrected, % added.', moved, added;

  delete from item_option_groups g
  using menu_items m
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and g.name = 'Size';

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select distinct m.id, 'Size', true, 1, 1
  from menu_items m join cs_sizes s on s.item = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, s.label, s.delta, s.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join cs_sizes s on s.item = m.name
  where m.restaurant_id = r and g.name = 'Size';

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $coldstone$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where (r.name ilike '%cold stone%' or r.name ilike '%coldstone%')
  and not exists (
    select 1 from cs_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%cold stone%' or r.name ilike '%coldstone%'
order by c.sort_order, m.sort_order;

drop table if exists cs_import;
drop table if exists cs_sizes;
