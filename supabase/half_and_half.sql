-- Half and Half: letting a customer say which two.
--
-- The pizza is on the menu with a size and a crust and nothing else, so
-- ordering one meant ordering a mystery. It now asks for a First half and a
-- Second half, from the 14 flavours Dominos makes.
--
-- ON THE PRICE. Each half carries half of what that flavour costs over a plain
-- Half and Half, so two halves of the same thing come to exactly that pizza,
-- and one of each comes to the middle of the two. A shop that charges for the
-- dearer half would ask a little more on a mixed one: BBQ Chicken beside
-- Margherita is 8,975 here and 9,350 by that rule. Say the word and the app
-- can be taught to charge the dearer half instead, which needs a code change
-- rather than a price list.
--
-- Safe to run twice.

drop table if exists hh_flavour;
create table hh_flavour (name text not null, delta int not null, sort int not null);

insert into hh_flavour (name, delta, sort) values ('BBQ Chicken', 575, 1);
insert into hh_flavour (name, delta, sort) values ('BBQ Meatball', 350, 2);
insert into hh_flavour (name, delta, sort) values ('BBQ Mega Meat', 800, 3);
insert into hh_flavour (name, delta, sort) values ('BBQ Suya Mix Grill', 800, 4);
insert into hh_flavour (name, delta, sort) values ('Chicken Supreme', 575, 5);
insert into hh_flavour (name, delta, sort) values ('Chicken Suya', 575, 6);
insert into hh_flavour (name, delta, sort) values ('Extravaganza', 800, 7);
insert into hh_flavour (name, delta, sort) values ('Margherita', 200, 8);
insert into hh_flavour (name, delta, sort) values ('Naija Fiesta', 800, 9);
insert into hh_flavour (name, delta, sort) values ('Pepperoni', 350, 10);
insert into hh_flavour (name, delta, sort) values ('Shawarma', 800, 11);
insert into hh_flavour (name, delta, sort) values ('Southern Style BBQ Chicken', 575, 12);
insert into hh_flavour (name, delta, sort) values ('The Lot', 800, 13);
insert into hh_flavour (name, delta, sort) values ('Veggie Supreme', 200, 14);

do $halfandhalf$
declare
  r uuid;
  item uuid;
  g uuid;
  which text;
begin
  select id into r from restaurants where name ilike '%domino%' limit 1;
  if r is null then
    raise exception 'No Dominos restaurant found.';
  end if;

  select id into item from menu_items
  where restaurant_id = r
    and upper(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) = 'HALFHALF'
  limit 1;
  if item is null then
    raise exception 'No Half and Half pizza found. Run dominos_full.sql first.';
  end if;

  -- Rebuilt rather than added to, so running this twice does not leave two
  -- of every flavour in the list.
  delete from item_option_groups
  where menu_item_id = item and name in ('First half', 'Second half');

  foreach which in array array['First half', 'Second half'] loop
    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (item, which, true, 1, case when which = 'First half' then 3 else 4 end)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, f.name, f.delta, f.sort from hh_flavour f;
  end loop;
end $halfandhalf$;

-- What a customer will be asked, and what each answer costs.
select g.name as question, o.name as answer, o.price_delta
from item_option_groups g
     join item_options o on o.group_id = g.id
     join menu_items m on m.id = g.menu_item_id
where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) = 'HALFHALF'
order by g.sort_order, o.sort_order;

drop table if exists hh_flavour;
