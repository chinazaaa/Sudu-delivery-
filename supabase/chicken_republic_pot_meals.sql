-- Chicken Republic pot meals: one question per drink.
--
-- A pot meal comes with two, four or six drinks and the export asked once,
-- so four people sharing a MAXI all got the same thing. Each drink is now its
-- own question, the way KFC writes it, and somebody can take three Cokes and
-- a water.
--
-- MINI Pot Lovers and the Big Crew Meal had no questions at all. They are out
-- of stock, and the export carries no options for anything out of stock, so
-- every one of the 37 products in that state arrived bare. These two are
-- filled in from what their own descriptions promise. The rest will pick
-- theirs up when they are back in stock and the menu is exported again.
--
-- Nothing here costs anything: all four drinks are included in the price, as
-- the export has them.
--
-- THE SIDES ARE STILL WRONG AND ARE LEFT ALONE. Every pot meal description
-- promises a choice of Spaghetti, Fried Rice, Naija Jollof or Rice and Beans,
-- and the export offers none of them: MAXI and MEGA carry a Side 1 of Chips
-- and a Side 2 of Dodo Cubes instead. Send the real lists and they can be put
-- right.
--
-- Touches nothing but these questions. No product, price, photograph or stock
-- flag is gone near. Safe to run twice.

drop table if exists pot_opt;
create table pot_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 21, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 21, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 21, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 21, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 22, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 22, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 22, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 22, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 21, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 21, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 21, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 21, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 22, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 22, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 22, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 22, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 23, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 23, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 23, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 23, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 24, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 24, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 24, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 24, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 21, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 21, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 21, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 21, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 22, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 22, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 22, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 22, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 23, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 23, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 23, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 23, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 24, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 24, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 24, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 24, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 25, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 25, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 25, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 25, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 26, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 26, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 26, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 26, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 21, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 21, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 21, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 21, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 22, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 22, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 22, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 22, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 23, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 23, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 23, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 23, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 24, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 24, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 24, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 24, 'Mineral Water (75cl)', 0, 4);

do $potmeals$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  written int := 0;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    raise exception 'No Chicken Republic found.';
  end if;

  -- The single Drinks question these meals used to carry, and anything this
  -- file wrote before.
  delete from item_option_groups g
  using menu_items m, (select distinct item from pot_opt) k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and (g.name = 'Drinks' or g.name like 'Drink %');

  for spec in
    select distinct item, question, question_sort from pot_opt
    order by item, question_sort
  loop
    select m.id into item_id from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(spec.item, '[^a-zA-Z0-9]', '', 'g'))
    limit 1;

    if item_id is null then
      raise notice 'No product called %, skipped.', spec.item;
      continue;
    end if;

    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (item_id, spec.question, true, 1, spec.question_sort)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from pot_opt k
    where k.item = spec.item and k.question = spec.question;

    written := written + 1;
  end loop;

  raise notice 'Wrote % drink questions.', written;
end $potmeals$;

select m.name as product, count(*) filter (where g.name like 'Drink %') as drinks_asked
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join item_option_groups g on g.menu_item_id = m.id
where r.name ilike '%chicken republic%'
  and (m.name ilike '%pot lovers%' or m.name ilike '%big crew%')
group by m.name
order by m.name;

drop table if exists pot_opt;
