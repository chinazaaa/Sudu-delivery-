-- Temi's sanitary pads, moved off the errand book onto the run that
-- carried them.
--
-- It was the last custom order still living as a line of money: three
-- packs at 6,000 and 2,000 to bring them, written as one figure of 20,000
-- with no bag, no run and nothing on her customer card. The product it
-- became is already on the Sudu Shop shelf at exactly 6,000, and the run
-- that went on campus at half eight that night is still there with nothing
-- paid on it, so there is nothing to invent.
--
-- The money does not change: 20,000 in, 4,950 out, 15,050 either way. It
-- stops being a figure in a notebook and becomes a run with a bag on it.
with ord as (
  insert into orders (batch_id, customer_phone, customer_name, hostel, subtotal_food, fee,
                      total, charged, paid_amount, status, payment_method,
                      created_at, paid_at, done_at, came_from, admin_note)
  values ('a78dc82e-1431-42c5-b757-8bb8c7a001b7', '07076340910', 'Temiloluwa Mayungbe',
          'Trezadel', 18000, 2000, 20000, 20000, 20000, 'delivered', 'transfer',
          '2026-10-02 10:12:28+00', '2026-10-02 19:30:00+00', '2026-10-02 19:30:00+00',
          'direct',
          'Asked for off the menu on 2 October and moved here from the errand book. The time it was paid was never written down, so it is set to the drop.')
  returning id
)
insert into order_items (order_id, menu_item_id, qty, unit_price_at_order)
select ord.id, '42dcbe27-1294-4f2a-866d-7eb4a54d9d9d', 3, 6000 from ord;

-- What the three packs cost. The only other order on this run was
-- cancelled, so nothing else on it was ever bought.
update batches
set food_spend = 4950,
    cost_note = 'Three packs of pads, 4,950.',
    settled_at = '2026-10-02 19:30:00+00'
where id = 'a78dc82e-1431-42c5-b757-8bb8c7a001b7';

-- The ask points at the order now rather than at a line of money.
update custom_requests
set order_id = (select id from orders
                where customer_phone = '07076340910'
                  and batch_id = 'a78dc82e-1431-42c5-b757-8bb8c7a001b7'
                limit 1),
    money_id = null,
    status = 'converted'
where wanted = 'Sanitary pads' and phone = '07076340910';

-- And the errand line goes, or the 20,000 is counted twice. The errand
-- book is empty now: every custom order this shop has taken is an order
-- on a run.
delete from other_money where id = '022da2f3-ecbd-4d1b-af4b-b55e3d70491e';
