-- KFC: the choices a meal leaves open.
--
-- A family meal arrives with two rices, two lots of fries and two drinks, and
-- every one of them is a choice. None of it was being asked, so the order
-- reached the counter saying Family meal 2 and nothing else.
--
-- Two drinks are two questions rather than one, the way KFC writes it, so
-- somebody can take a Pepsi and a water. The dips are one question that takes
-- four answers.
--
-- Covers 1 product so far: Family meal 2. The rest of the KFC
-- meals work the same way and only need their lists. Add rows to the block
-- below in the same shape and run it again.
--
-- Safe to run twice: every question here is rebuilt rather than added to.

drop table if exists kfc_opt;
create table kfc_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  max_select    int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 1', 1, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 1', 1, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 2', 2, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 2', 2, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Chicken', 3, 1, 'COB-HC 8 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Chicken', 3, 1, 'COB-HC suya 8 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 4, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 4, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 4, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 1', 6, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 1', 6, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 2', 7, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 2', 7, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Mayonnaise', 0, 4);

do $kfcoptions$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  touched int := 0;
begin
  select id into r from restaurants where name ilike '%kfc%' limit 1;
  if r is null then
    raise exception 'No KFC found. Run kfc_full.sql first.';
  end if;

  -- Clear only the questions this file is about to write, so anything else
  -- set up by hand survives.
  delete from item_option_groups g
  using menu_items m, kfc_opt k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and g.name = k.question;

  for spec in
    select distinct item, question, question_sort, max_select
    from kfc_opt order by item, question_sort
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
    values (item_id, spec.question, true, spec.max_select, spec.question_sort)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from kfc_opt k
    where k.item = spec.item and k.question = spec.question;

    touched := touched + 1;
  end loop;

  raise notice 'Wrote % questions.', touched;
end $kfcoptions$;

-- What a customer will now be asked.
select m.name, g.name as question, g.max_select as pick,
       string_agg(o.name || case when o.price_delta = 0 then ''
                                 else ' +' || o.price_delta end,
                  ', ' order by o.sort_order) as answers
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join item_option_groups g on g.menu_item_id = m.id
     join item_options o on o.group_id = g.id
where r.name ilike '%kfc%'
group by m.name, g.name, g.max_select, g.sort_order
order by m.name, g.sort_order;

drop table if exists kfc_opt;
