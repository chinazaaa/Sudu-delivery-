-- The four on the skincare shelf that were still shouting.
--
-- The same backlog as 0111 and the same caser behind it, run over the shelf
-- rather than the kitchens. Three come straight from tidyName in lib/case.ts;
-- COSRX is written as the brand writes it, because a caser cannot know that
-- and a person reading the shelf can.
--
-- Left alone: "Orinary" is a typo for The Ordinary in the source menu, and a
-- misspelling is a different thing from a shout.
update menu_items i set name = t.tidy
from (values
  ('ADVANCED CLINICALS GREEN COFFEE BEAN OIL', 'Advanced Clinicals Green Coffee Bean Oil'),
  ('COSRX RX-ADVANCED SNAIL KIT', 'COSRX RX-Advanced Snail Kit'),
  ('LOVE COTTON ROUND PADS 500CT', 'Love Cotton Round Pads 500CT'),
  ('THE ORINARY RETINOL 1% IN SQUALENE 30ML', 'The Orinary Retinol 1% in Squalene 30ML')
) as t(shouted, tidy)
where i.name = t.shouted;
