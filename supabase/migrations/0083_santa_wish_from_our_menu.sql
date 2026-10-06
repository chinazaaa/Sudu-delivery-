-- A wish that is something we already sell.
--
-- Most of a wishlist is a thing somebody has to be sent out to find. Some of
-- it is on our own shelf, and that half should not be: it has a price, a
-- picture and a cost we already know, and typing it back in by hand is how
-- the price on the list stops agreeing with the price in the shop.
--
-- Null is the normal case and stays the normal case: a wish is a sentence
-- somebody wrote, and this only names the ones that are ours.
alter table santa_wishes
  add column if not exists item_id uuid references menu_items(id) on delete set null;
