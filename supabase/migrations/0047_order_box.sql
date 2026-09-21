-- Which box an order came out of.
--
-- A box order is an ordinary order and lands in every total already, which
-- is right: money is money. What that hides is which box anybody wanted,
-- and that is the whole reason for packing three of them rather than one.
--
-- Null on every ordinary order, and on a gift bought off the menu.
alter table orders
  add column if not exists box_id uuid references boxes(id) on delete set null;

create index if not exists orders_box_idx on orders (box_id) where box_id is not null;
