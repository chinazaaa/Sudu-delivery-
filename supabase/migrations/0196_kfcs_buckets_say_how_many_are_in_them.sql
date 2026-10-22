/*
 * KFC's buckets say how many are in them.
 *
 * The board prices buckets at 9, 12 and 21 pieces. The menu here called the
 * same three 5 pieces, 8 pcs and 15 pcs, which came in with an import and
 * was never checked against a wall.
 *
 * They are the same three products, and the prices say so: 23,399 against a
 * cost of 23,999, 33,299 against 34,173, 53,699 against 55,130. The counts
 * confirm it from the other side. At 9, 12 and 21 the board works out at
 * 2,600, 2,775 and 2,557 a piece, which is one price with a bulk break at
 * the top. At 5, 8 and 15 it would be 4,680, 4,162 and 3,580, which is not
 * a price list anybody writes.
 *
 * No money moves. The costs already clear the board and are untouched. What
 * changes is that somebody ordering a bucket is told what they are getting,
 * instead of being quietly handed nearly twice it.
 *
 * Order lines point at the item rather than keeping their own copy of the
 * name, so this also rewrites how past orders read. That is the right way
 * round here: those customers were handed 9 pieces, and the order now says
 * so rather than saying 5.
 */
update menu_items mi
set name = replace(mi.name, '5 pieces', '9 pieces')
from restaurants r
where r.id = mi.restaurant_id
  and r.name = 'KFC'
  and mi.name in (
    'Original Recipe Chicken, 5 pieces',
    'Hot & Crispy Chicken, 5 pieces',
    'Hot & Crispy Suya Chicken, 5 pieces'
  );

update menu_items mi
set name = '12 pcs kfc bucket'
from restaurants r
where r.id = mi.restaurant_id and r.name = 'KFC' and mi.name = '8 pcs kfc bucket';

update menu_items mi
set name = '21 pcs kfc bucket'
from restaurants r
where r.id = mi.restaurant_id and r.name = 'KFC' and mi.name = '15 pcs kfc bucket';
