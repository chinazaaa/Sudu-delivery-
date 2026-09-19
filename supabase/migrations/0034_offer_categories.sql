-- Which parts of a menu an offer is for, where it is a whole section rather
-- than a handful of dishes.
--
-- "Any pizza" is one tick here instead of forty in the dish list, and it
-- keeps up: a pizza added to the menu next week is in the offer without
-- anybody remembering to add it. The categories are resolved to their dishes
-- each time the offer is read, so nothing goes stale.
create table if not exists coupon_categories (
  coupon_code text not null references coupons(code) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  primary key (coupon_code, category_id)
);
create index if not exists coupon_categories_category_idx
  on coupon_categories (category_id);
alter table coupon_categories enable row level security;

-- A choice every line has to have made, by the name of the option: "Large".
--
-- Size is a choice on a dish rather than a dish of its own, so "any large
-- pizza" cannot be said with a list of dishes at all. It is the pizza section
-- plus this.
--
-- Matched on the name because each dish carries its own copy of the option,
-- so there is no one Large to point at. That puts weight on naming them the
-- same way, which is why admin says how many of the dishes it is actually
-- catching rather than leaving it to be found out on a Friday.
alter table coupons add column if not exists required_choice text not null default '';

notify pgrst, 'reload schema';
