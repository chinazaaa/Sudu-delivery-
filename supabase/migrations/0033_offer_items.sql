-- Which dishes an offer is for, where it is for particular dishes rather than
-- a whole kitchen.
--
-- "Order the BBQ beef medium and delivery is free" is the same kind of thing
-- as "Domino's delivery is 2,000": it applies by itself, it is good on
-- chosen runs and chosen windows, it has a cap and an expiry. The only
-- difference is what makes a cart qualify. So it is an offer with an item
-- list rather than a flag on the dish, which would have had nowhere to keep
-- any of that.
--
-- Two of them together still qualify: each was worth the trip on its own.
create table if not exists coupon_items (
  coupon_code  text not null references coupons(code) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  primary key (coupon_code, menu_item_id)
);
create index if not exists coupon_items_item_idx on coupon_items (menu_item_id);
alter table coupon_items enable row level security;

-- Free delivery is a fee of nothing, so the fee can be nothing.
do $$
begin
  alter table coupons drop constraint if exists coupons_amount_check;
  alter table coupons add constraint coupons_amount_check check (amount >= 0);
end $$;

notify pgrst, 'reload schema';
