-- The spare car on 20 October, and the cancelled order holding it there.
--
-- The left-behind cart from the 19th was converted into an order, the
-- customer did not want it, and the order was cancelled. That left a car
-- on the board carrying one cancelled order and nothing else.
--
-- Deleted on request. Written down here because a delete leaves nothing
-- behind to read: order 1051, Temiloluwa Mayungbe, 07076340910, cancelled,
-- raised 20 October 06:14 UTC. Chicken Republic Shawarma x1 at 5,350 and
-- Domino's Chicken Wings With Marinara 7PCS x1 at 8,050. Food 13,400,
-- delivery 6,500, total 19,900. Never paid, so no money moves.
--
-- A run refuses to go while any order sits on it, which is why the order
-- goes first.
delete from order_items
where order_id = '8339e1cc-f105-4b58-aafc-030c3b56124b';

delete from orders where id = '8339e1cc-f105-4b58-aafc-030c3b56124b';

delete from batches where id = 'ea340c4d-6d8f-4f05-98ac-bf85a2122d52';

-- Deleting the order emptied the cart's link to it and left the converted
-- stamp, so the cart sat in Bought with nothing to open: a record of money
-- that never arrived, in the one list meant to show what the chasing is
-- worth. Dealt with rather than bought, which is what happened, and in the
-- handled list the decision can still be undone.
update carts
set converted_at = null,
    converted_order_id = null,
    handled_at = coalesce(handled_at, '2026-10-20 06:14:22+00')
where id = '5c0ca01a-0499-40f8-a8c8-d3f0a454eac2';
