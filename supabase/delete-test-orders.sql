-- Deleting a test order, for good.
--
-- Refunding is the ordinary way to make an order stop counting: it stays on
-- the books and drops out of every total. This is the other thing, for a row
-- that was never real, and it cannot be undone.
--
-- 1002a and 1002b are not one order in two halves. They are two orders that
-- happened to share a car, and the letters are worked out on the page from
-- the lowest number in the group, so they are #1002 and #1003 in the table.
--
-- Everything under an order goes with it on its own: the items cascade, and
-- the options under each item cascade from those. Nothing else in the
-- database points at an order except another order that was shared with it,
-- and that link is set to null rather than followed.

-- 1. Look first. Run this on its own and read it: it is the last chance to
--    notice a number that is not the one you meant.
select o.order_no,
       o.customer_name,
       o.status,
       o.total,
       o.created_at,
       b.run_date,
       b.slot
from orders o
join batches b on b.id = o.batch_id
where o.order_no in (1002, 1003);

-- 2. Delete them. Paid and delivered orders are refused by the where clause
--    rather than by trust: money that has actually arrived belongs on the
--    books whatever anybody meant to type.
delete from orders
where order_no in (1002, 1003)
  and status in ('pending', 'refunded');

-- 3. The group they were in, now that nothing is in it. A group with no
--    orders and no seats is a row nobody will ever open again. Skip this if
--    you only deleted one of the two and the other is still in the car.
delete from order_groups g
where g.closed_at is not null
  and not exists (select 1 from orders o where o.group_id = g.id)
  and not exists (select 1 from group_carts c where c.group_id = g.id);

-- 4. Check. Both should come back with nothing.
select count(*) as orders_left from orders where order_no in (1002, 1003);
