-- KFC marked up like everywhere else, now somebody has read its board.
--
-- 0187 recorded KFC at no markup, reasoning from its prices alone: 599 and
-- 64,999 are not figures a sum produces, so they looked like KFC's own
-- board typed straight in, and the shop looked to be earning nothing on
-- the food.
--
-- Photographs of the board say otherwise. Every line that can be matched is
-- marked up by between sixteen and twenty per cent:
--
--   Streetbite      1,999 on the board, 2,399 here
--   Zinger          5,699 on the board, 6,699 here
--   Double Down     7,999 on the board, 9,399 here
--   Streetwise 1    4,199 on the board, 5,199 here
--   12 pcs chicken 17,999 on the board, 20,999 here
--   21 pcs bucket  53,699 on the board, 62,499 here
--   Sharing 3      34,399 on the board, 40,599 here
--
-- So taking fifteen per cent back off lands above what KFC really charges
-- every time, by between 61 and 904 naira, which is the safe side: the
-- shop's cost should never sit under the counter's own price or a run
-- books a profit it did not make. The prices end in nine because KFC's do,
-- and the shop rounded its own the same way rather than to fifty.
--
-- Null rather than fifteen, so KFC follows the shop's figure like every
-- other counter rather than carrying a copy of it that would not move when
-- the shop's did.
update restaurants set markup = null where name = 'KFC';

update menu_items mi
set price_cost = round(mi.price_food / 1.15)
from restaurants r
where r.id = mi.restaurant_id and r.name = 'KFC' and mi.price_food > 0;
