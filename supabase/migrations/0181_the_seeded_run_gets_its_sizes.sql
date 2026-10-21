-- The seeded run had no sizes on it, which made the message to a counter
-- read "1 x Panarottis Special" with nothing to cook it at. The code was
-- right and the test data was lying, which is the worse of the two.
--
-- unit_price_at_order is the whole price of one of that line including its
-- choices, so the size's delta goes into it rather than being added again
-- anywhere downstream.
with target as (
  select o.id as order_id, oi.id as item_id, oi.menu_item_id
  from orders o
  join batches b on b.id = o.batch_id
  join order_items oi on oi.order_id = o.id
  where b.runner_token = 'seedrun-look-at-this-one'
),
sized as (
  insert into order_item_options (order_item_id, option_id, name_at_order, price_delta_at_order)
  select t.item_id, v.option_id::uuid, v.said, v.delta
  from target t
  join (values
    ('f5779865-8a96-49ac-8401-0edfbd645bc4', 'bd07861d-d1a7-4d13-935a-6faeec484e6b', 'Large', 6600),
    ('1d80d4e0-81a0-4bab-9f58-2aa2c6704022', 'c27ce580-7435-439c-97a8-ea1327890da7', 'Monsterito', 27050)
  ) as v(item, option_id, said, delta) on v.item::uuid = t.menu_item_id
  returning order_item_id
),
repriced as (
  update order_items oi
  set unit_price_at_order = oi.unit_price_at_order + v.delta
  from (values
    ('f5779865-8a96-49ac-8401-0edfbd645bc4', 6600),
    ('1d80d4e0-81a0-4bab-9f58-2aa2c6704022', 27050)
  ) as v(item, delta)
  where oi.menu_item_id = v.item::uuid
    and oi.order_id in (select order_id from target)
  returning oi.order_id
)
update orders o
set subtotal_food = o.subtotal_food + 6600 + 27050,
    total = o.total + 6600 + 27050
where o.id in (select order_id from target);
