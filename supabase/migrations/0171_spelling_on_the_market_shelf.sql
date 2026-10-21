-- Spellings a customer would search for and not find.
--
-- "Basmatic" is the one that costs money: somebody typing basmati into
-- the search box gets nothing, and the shop looks like it does not carry
-- it. The others are tidiness.
update menu_items i
set name = v.fixed
from (values
  ('Basmatic rice 5kg', 'Basmati rice 5kg'),
  ('Basmatic rice 1kg', 'Basmati rice 1kg'),
  ('Cling Flim', 'Cling film'),
  ('SONIA chilli peppe powder', 'Sonia chilli pepper powder'),
  ('LARSOR fish seasoning', 'Larsor fish seasoning')
) as v(was, fixed)
where i.restaurant_id = (select id from restaurants where slug = 'local-market')
  and i.name = v.was;
