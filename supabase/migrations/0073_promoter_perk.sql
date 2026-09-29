-- The discount a promoter's own link carries.
--
-- Not an amount: the name of an ordinary coupon. Everything a discount needs
-- to be safe already lives on that table, so this is the one thing the link
-- has to know, and "₦500 off the first delivery" can be changed, capped,
-- dated or switched off from the coupons page like any other offer.
alter table settings add column if not exists promoter_perk_code text not null default '';
