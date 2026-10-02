-- The product a request turned into, if it turned into one.
--
-- "Asked for" is read for the pattern: three people wanting the same power
-- bank is a thing to stock. Spotting that and then retyping the name into
-- the menu by hand, in another part of admin, is where it stopped being
-- worth doing. This is the thread back, so the card can say it has been put
-- on a shelf and offer to open it rather than quietly making a second copy.
alter table custom_requests
  add column if not exists menu_item_id uuid references menu_items(id) on delete set null;
