-- Burger King: the choices a meal leaves open.
--
-- A meal comes with a side and a drink and both are a choice. Neither was
-- being asked, so the order reached the counter naming the meal and nothing
-- else.
--
-- The meal already carries its size as a choice, so one product covers
-- regular, medium and large. These questions hang off that same product: the
-- sides and drinks you sent are the medium ones, and if the regular and large
-- meals offer different portions, send those and the question can depend on
-- the size instead.
--
-- Burger King also lists a question naming the burger itself, with the burger
-- as the only answer. That is left out: a question with one answer is a tap
-- that tells nobody anything.
--
-- Covers 1 product so far: BBQ Egg Burger Meal. The rest work the
-- same way and only need their lists.
--
-- Safe to run twice.

drop table if exists bk_opt;
create table bk_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  max_select    int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Side', 1, 1, 'Fries, medium', 0, 1);
insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Side', 1, 1, 'Sweet potato, regular', 0, 2);
insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Side', 1, 1, 'Yam fries, regular', 0, 3);
insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Side', 1, 1, 'Plantain, regular', 0, 4);
insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Drink', 2, 1, 'Coca-Cola 35cl', 0, 1);
insert into bk_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('BBQ Egg Burger Meal', 'Drink', 2, 1, 'Water 75cl', 0, 2);

do $burgerkingoptions$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  touched int := 0;
begin
  select id into r from restaurants where name ilike '%burger king%' limit 1;
  if r is null then
    raise exception 'No Burger King found. Run burger_king_full.sql first.';
  end if;

  delete from item_option_groups g
  using menu_items m, bk_opt k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and g.name = k.question;

  for spec in
    select distinct item, question, question_sort, max_select
    from bk_opt order by item, question_sort
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
    values (item_id, spec.question, true, spec.max_select, spec.question_sort + 10)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from bk_opt k
    where k.item = spec.item and k.question = spec.question;

    touched := touched + 1;
  end loop;

  raise notice 'Wrote % questions.', touched;
end $burgerkingoptions$;

select m.name, g.name as question, g.max_select as pick, count(o.id) as answers
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join item_option_groups g on g.menu_item_id = m.id
     join item_options o on o.group_id = g.id
where r.name ilike '%burger king%'
group by m.name, g.name, g.max_select, g.sort_order
order by m.name, g.sort_order;

drop table if exists bk_opt;
