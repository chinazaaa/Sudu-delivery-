-- Which order an ask turned into.
--
-- A request already remembers the product it became and the line of money
-- it became. The third thing it can become is an ordinary order, and that
-- was the one it forgot: the card said "they placed it as an ordinary
-- order" and then left you to find which one.
--
-- That link is the whole answer to "did asking for this ever come to
-- anything", which is the question the asking list exists to answer.
alter table custom_requests
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists custom_requests_order_id_idx
  on custom_requests (order_id) where order_id is not null;

-- Temi's two asks today, the bole and the prawn rice, both became order
-- 1052. They were marked done, which on a card with no money against it
-- reads as "not going ahead": they went ahead, on an order.
update custom_requests
set order_id = (select id from orders where order_no = 1052), status = 'converted'
where phone = '07076340910'
  and created_at::date = '2026-10-20'
  and wanted in ('Roasted plantain (bole)',
                 'Shrimp rice from the place restaurant and honey BBQ chicken');

-- The Fantasy Icecream ask became order 1047, off a product made for it on
-- the Sudu Shop shelf. The card already said it was converted and could not
-- say into what.
update custom_requests
set order_id = (select id from orders where order_no = 1047),
    menu_item_id = (select mi.id from menu_items mi
                    join restaurants r on r.id = mi.restaurant_id
                    where mi.name = 'Fantasy icecream' and r.slug = 'sudu-shop'
                    limit 1)
where wanted = 'Fantasy Icecream';
