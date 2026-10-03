-- Nothing goes on sale at nothing.
--
-- The menu prints a price rather than hiding a zero, so an item marked
-- available with price_food = 0 is free food on the website that anybody can
-- order. A stray tap on the stock page put a 0 naira Cinnamon Roll on the
-- Krispy Kreme menu, and nothing anywhere stopped it: the restaurant page
-- carried a tooltip saying to set a price first, and that was the whole of
-- the enforcement.
--
-- Here rather than only in the app, because the app is not the only way in:
-- an import, a direct query, or code written next year all reach this table.
-- Switching something off is never restricted, whatever its price.
alter table menu_items
  add constraint menu_items_priced_before_on_sale
  check (not available or price_food > 0);
