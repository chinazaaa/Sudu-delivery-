-- What actually sells, so the list can open with it.
--
-- Browse was sorted A to Z, which on a thousand items means the first things
-- a student sees are 5 Alive, 7UP and Aquafina: three bottles of drink, on
-- the page where somebody is deciding what to eat. Nothing about that list
-- was wrong, it was just the one order that carries no information at all.
--
-- Kept as a count on the item rather than worked out on the way in, because
-- the alternative is adding up every order ever placed to draw twenty-four
-- cards. A trigger keeps it, so nothing in the app has to remember to.
alter table menu_items add column if not exists ordered_count integer not null default 0;

create or replace function note_item_ordered() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update menu_items
     set ordered_count = ordered_count + greatest(1, coalesce(new.qty, 1))
   where id = new.menu_item_id;
  return new;
end;
$$;

create or replace trigger order_items_counted
  after insert on order_items
  for each row execute function note_item_ordered();

-- Every order already placed, counted once.
update menu_items i set ordered_count = x.sold
from (
  select menu_item_id, sum(greatest(1, coalesce(qty, 1)))::int as sold
    from order_items
   group by menu_item_id
) x
where x.menu_item_id = i.id;
