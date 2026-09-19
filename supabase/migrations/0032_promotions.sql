-- A promotion: a code that needs no typing, and sets the delivery rather than
-- taking money off it.
--
-- "Order Domino's, delivery is 2,000" is not a discount on the ladder, it is
-- a different price entirely: five items or one, it is 2,000. And nobody
-- types anything, because a price nobody has to know a word for is a price
-- everybody gets.
--
-- It lives with the codes rather than beside them because it is the same
-- thing in every other respect: one restaurant, chosen runs, an expiry, a cap
-- on how many orders it is good for, an on and off switch, and the strip
-- along the top that reads the offer rather than repeating a sentence.
alter table coupons add column if not exists automatic boolean not null default false;

-- How many items the headline price covers, and what each one after that
-- costs. "2,000 for three, 500 an item after" is still one price somebody can
-- say out loud, and it stops one person filling the boot for the price of a
-- pizza without a cliff where the offer suddenly stops applying.
--
-- Blank included_items means truly flat, however much they order.
alter table coupons add column if not exists included_items int;
alter table coupons add column if not exists extra_per_item int not null default 0
  check (extra_per_item >= 0);

-- Which same day windows it is good for, as the hour each one starts, comma
-- separated: "12,15". Empty means every window, and a run is not a window so
-- runs are unaffected by this.
--
-- The hour rather than a time: the windows on offer slide through the day as
-- it gets late, so anything fixed to an instant would stop matching by two
-- o'clock. An order belongs to a window if its delivery hour falls inside it.
alter table coupons add column if not exists windows text not null default '';

-- A promotion in a group: split, but never below this each.
--
-- Two thousand each was more than most of them pay today, so the group would
-- simply not use it. Split with a floor keeps the reason to bring somebody:
-- on your own it is the whole two thousand, with a friend it is a thousand
-- each, and it stops falling there rather than running to nothing at twenty.
--
-- Zero is a plain split, and setting it to the fee itself is a flat price
-- per head.
alter table coupons add column if not exists min_per_person int not null default 0
  check (min_per_person >= 0);

-- "fee" is the promotion: the delivery becomes this amount, rather than this
-- amount coming off it.
do $$
begin
  alter table coupons drop constraint if exists coupons_applies_to_check;
  alter table coupons add constraint coupons_applies_to_check
    check (applies_to in ('delivery', 'order', 'fee'));
end $$;

-- An automatic offer has no code to type, but the table is keyed by code and
-- the strip names one, so it still has one. This keeps two automatic offers
-- from both claiming the same order, which is the one thing that must not
-- happen: a checkout carries one offer.
create index if not exists coupons_automatic_idx on coupons (automatic) where automatic;

notify pgrst, 'reload schema';
