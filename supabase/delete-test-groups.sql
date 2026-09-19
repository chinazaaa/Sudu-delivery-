-- Deleting a shared delivery that was never real.
--
-- A group is not an order. It holds the seats people sat in and points at the
-- car they were going to ride; the orders it made, if it made any, stand on
-- their own and keep nothing but a link back to it. So deleting a group is
-- safe for the orders: their group_id is set to null, nothing about the money
-- changes, and the run sheet does not move.
--
-- What does go with it, and cannot be got back, is the seats: the food people
-- had chosen and not yet finalised. For a test that is the point.

-- 1. Look first. Every group still open or closed, with what came of it.
--    Orders is the number that matters: a group with orders is a real car,
--    and deleting it loses the record of who was in it together.
select g.id,
       g.leader_name,
       g.created_at,
       g.closed_at is not null as closed,
       (select count(*) from orders o      where o.group_id = g.id) as orders,
       (select count(*) from group_carts c where c.group_id = g.id) as seats,
       b.run_date,
       b.slot
from order_groups g
join batches b on b.id = g.batch_id
order by g.created_at desc
limit 50;

-- 2. The tests: groups nothing came out of. Nobody's order points at these,
--    because either nothing was ever ordered or the orders have already been
--    deleted, so there is nothing to lose but the empty seats.
delete from order_groups g
where not exists (select 1 from orders o where o.group_id = g.id);

-- 3. Or, to pick them off one at a time instead, put the ids from step 1 here
--    and run this rather than step 2. This one bins the seats with them, so
--    only use it on a car nobody is still sitting in.
--
-- delete from order_groups
-- where id in ('paste-an-id-here', 'and-another');

-- 4. Check. The list should be shorter, and every row left should have orders.
select count(*) as groups_left from order_groups;
