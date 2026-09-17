-- Chicken Republic: asking which drink, and which chips.
--
-- A meal that comes with a PET drink was going through without saying which
-- one, so the counter sheet could not say either and somebody had to guess at
-- the till. 19 products include a drink and now ask for it, and the
-- 6 that come with chips ask what size.
--
-- Prices are what you sent: the drinks that come with the meal add nothing,
-- and the bigger or fancier ones add the difference.
--
-- THE POT MEALS ARE NOT INCLUDED. MAXI, MEGA and MINI Pot Lovers and the Big
-- Crew Meal come with two, four or six drinks rather than one, and a question
-- that takes a single answer cannot ask for six. Tell me how you want those
-- to read and they can be done properly.
--
-- Safe to run twice. Both questions are rebuilt each time rather than added
-- to, so it never leaves two of every drink in the list.

drop table if exists cr_drink;
drop table if exists cr_chip;
drop table if exists cr_needs_drink;
drop table if exists cr_needs_chips;
create table cr_drink (name text not null, delta int not null, sort int not null);
create table cr_chip (name text not null, delta int not null, sort int not null);
create table cr_needs_drink (name text not null);
create table cr_needs_chips (name text not null);

insert into cr_drink (name, delta, sort) values ('Coca Cola (35cl)', 0, 1);
insert into cr_drink (name, delta, sort) values ('Mineral Water (75cl)', 0, 2);
insert into cr_drink (name, delta, sort) values ('Fanta Orange (35cl)', 0, 3);
insert into cr_drink (name, delta, sort) values ('Sprite (35cl)', 0, 4);
insert into cr_drink (name, delta, sort) values ('Schweppes Mojito (40cl)', 200, 5);
insert into cr_drink (name, delta, sort) values ('Schweppes Pineapple (40cl)', 200, 6);
insert into cr_drink (name, delta, sort) values ('Schweppes Chapman (40cl)', 200, 7);
insert into cr_drink (name, delta, sort) values ('Sprite (50cl)', 350, 8);
insert into cr_drink (name, delta, sort) values ('Coca Cola (50cl)', 350, 9);
insert into cr_drink (name, delta, sort) values ('Fanta Orange (50cl)', 350, 10);
insert into cr_drink (name, delta, sort) values ('Monster Energy - Mango Loco', 1000, 11);
insert into cr_drink (name, delta, sort) values ('Predator - Gold', 1200, 12);
insert into cr_drink (name, delta, sort) values ('5Alive - Pulpy Orange (30cl)', 1300, 13);
insert into cr_drink (name, delta, sort) values ('Monster Energy - Ultra', 1800, 14);
insert into cr_drink (name, delta, sort) values ('Monster Energy - Regular', 1800, 15);

insert into cr_chip (name, delta, sort) values ('Chips (Large)', 0, 1);
insert into cr_chip (name, delta, sort) values ('Chips (Jumbo)', 1000, 2);

insert into cr_needs_drink (name) values ('Bigwhizz Reloaded');
insert into cr_needs_drink (name) values ('Big Whizz Meal');
insert into cr_needs_drink (name) values ('Shawarma Combo');
insert into cr_needs_drink (name) values ('Big Boyz Combo');
insert into cr_needs_drink (name) values ('Double ChickWhizz Meal');
insert into cr_needs_drink (name) values ('Double Chief Burger Combo');
insert into cr_needs_drink (name) values ('Chief Burger Combo');
insert into cr_needs_drink (name) values ('ChickWhizz Meal');
insert into cr_needs_drink (name) values ('Citizens Meal BOGOF');
insert into cr_needs_drink (name) values ('Citizens Spicy Yam Meal');
insert into cr_needs_drink (name) values ('Citizens Meal');
insert into cr_needs_drink (name) values ('Refuel Max Combo');
insert into cr_needs_drink (name) values ('Express Combo');
insert into cr_needs_drink (name) values ('Spicy Yam Combo');
insert into cr_needs_drink (name) values ('Refuel More');
insert into cr_needs_drink (name) values ('Quarter Rotisserie Combo');
insert into cr_needs_drink (name) values ('Citizens Rice & Beans Combo');
insert into cr_needs_drink (name) values ('Carribean Meal Combo');
insert into cr_needs_drink (name) values ('Stir-Fried Meal Combo');

insert into cr_needs_chips (name) values ('Shawarma Combo');
insert into cr_needs_chips (name) values ('Double ChickWhizz Meal');
insert into cr_needs_chips (name) values ('Double Chief Burger Combo');
insert into cr_needs_chips (name) values ('Chief Burger Combo');
insert into cr_needs_chips (name) values ('ChickWhizz Meal');
insert into cr_needs_chips (name) values ('Express Combo');

do $chickenrepublicoptions$
declare
  r uuid;
  target record;
  g uuid;
  added int := 0;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    raise exception 'No Chicken Republic found. Run chicken_republic_full.sql first.';
  end if;

  delete from item_option_groups g
  using menu_items m
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and g.name in ('Drink', 'Size (chips)');

  for target in
    select m.id from menu_items m join cr_needs_drink d
      on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
       = upper(regexp_replace(d.name, '[^a-zA-Z0-9]', '', 'g'))
    where m.restaurant_id = r
  loop
    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (target.id, 'Drink', true, 1, 1) returning id into g;
    insert into item_options (group_id, name, price_delta, sort_order)
    select g, d.name, d.delta, d.sort from cr_drink d;
    added := added + 1;
  end loop;
  raise notice 'Asked % products which drink.', added;

  added := 0;
  for target in
    select m.id from menu_items m join cr_needs_chips c
      on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
       = upper(regexp_replace(c.name, '[^a-zA-Z0-9]', '', 'g'))
    where m.restaurant_id = r
  loop
    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (target.id, 'Size (chips)', true, 1, 2) returning id into g;
    insert into item_options (group_id, name, price_delta, sort_order)
    select g, c.name, c.delta, c.sort from cr_chip c;
    added := added + 1;
  end loop;
  raise notice 'Asked % products what size chips.', added;
end $chickenrepublicoptions$;

-- Anything in the lists above that is not on the menu under that name, which
-- would mean it was missed.
select d.name as not_found
from cr_needs_drink d
where not exists (
  select 1 from menu_items m join restaurants r on r.id = m.restaurant_id
  where r.name ilike '%chicken republic%'
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(d.name, '[^a-zA-Z0-9]', '', 'g'))
);

-- What now carries a question.
select m.name, g.name as question, count(*) as answers
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join item_option_groups g on g.menu_item_id = m.id
     join item_options o on o.group_id = g.id
where r.name ilike '%chicken republic%'
group by m.name, g.name, m.sort_order, g.sort_order
order by m.sort_order, g.sort_order;

drop table if exists cr_drink;
drop table if exists cr_chip;
drop table if exists cr_needs_drink;
drop table if exists cr_needs_chips;
