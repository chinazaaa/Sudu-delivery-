-- Fake orders for testing the admin screen before a single real order is taken
-- (brief §13). Run this against a development project only, then check the
-- counter sheet, handout list and batch summary read correctly on a phone.
--
-- Clean up afterwards with:
--   delete from orders where customer_phone like '0800%';
--   delete from customers where phone like '0800%';

insert into promoters (code, name, phone) values ('TOLU', 'Tolu (class rep)', '08031112222')
  on conflict (code) do nothing;

with batch as (
  select id from batches where status = 'open' order by cut_off_at limit 1
),
people as (
  select * from (values
    ('0800000001', 'Ada Obi',      'Blue Block',   true),
    ('0800000002', 'Femi Adeoye',  'Red Block',    true),
    ('0800000003', 'Chidi Eze',    'Green Block',  true),
    ('0800000004', 'Zainab Bello', 'Blue Block',   true),
    ('0800000005', 'Tola Ajayi',   'Yellow Block', true),
    ('0800000006', 'Nkem Udo',     'Red Block',    true),
    ('0800000007', 'Sade Lawal',   'Green Block',  true),
    ('0800000008', 'Emeka Nwosu',  'Blue Block',   true),
    ('0800000009', 'Halima Sani',  'Red Block',    false)
  ) as p(phone, name, hostel, paid)
),
inserted as (
  insert into orders (
    batch_id, customer_phone, customer_name, hostel,
    subtotal_food, fee, discount, total, status, paid_at, promoter_code
  )
  select
    batch.id, people.phone, people.name, people.hostel,
    0, 4000, 0, 4000,
    case when people.paid then 'paid'::order_status else 'pending'::order_status end,
    case when people.paid then now() end,
    case when people.phone = '0800000003' then 'TOLU' end
  from batch, people
  returning id, customer_phone
)
insert into order_items (order_id, menu_item_id, qty, unit_price_at_order)
select inserted.id, m.id, 1 + (abs(hashtext(inserted.customer_phone || m.name)) % 2), m.price_food
from inserted
join lateral (
  select id, name, price_food from menu_items
  where available
  order by md5(inserted.customer_phone || id::text)
  limit 2
) m on true;

-- Re-derive the money now that the items exist.
update orders o set
  subtotal_food = i.food,
  total = i.food + o.fee - o.discount
from (
  select order_id, sum(qty * unit_price_at_order) as food
  from order_items group by order_id
) i
where i.order_id = o.id and o.customer_phone like '0800%';
