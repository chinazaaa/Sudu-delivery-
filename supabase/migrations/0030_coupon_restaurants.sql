-- Which restaurants a code works on. A code like AWOF is a deal with one
-- kitchen, not a discount on anything the shop carries, so it has to hold to
-- that kitchen and no other.
--
-- With no rows here it works on anything, which is what every code written
-- before today is. With rows, the whole cart has to come from those places:
-- a code for Domino's on a cart of Domino's and a shawarma is a code being
-- spent on the shawarma too, and the deal does not cover that.
create table if not exists coupon_restaurants (
  coupon_code   text not null references coupons(code) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  primary key (coupon_code, restaurant_id)
);
create index if not exists coupon_restaurants_place_idx
  on coupon_restaurants (restaurant_id);
alter table coupon_restaurants enable row level security;

notify pgrst, 'reload schema';
