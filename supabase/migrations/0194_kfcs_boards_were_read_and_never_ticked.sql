/*
 * KFC's boards were read, and never ticked.
 *
 * Four photographs of the boards in the shop settled KFC a while back. They
 * showed the counter marks up between sixteen and twenty per cent, not the
 * fifteen used here, which is why taking fifteen back off a Sudu price
 * lands above what KFC actually charges on every line, by between sixty-one
 * and one thousand four hundred. That is the test passing, and comfortably.
 *
 * It is also why KFC's own markup was taken off again in 0189: a counter
 * that is dearer than the shop assumes is an ordinary counter, not one
 * needing a rule of its own.
 *
 * What never happened was the tick. The costs were set from that reading
 * and left flagged as guesses, so the menu page has been telling the shop
 * that forty checked items are estimates. Nothing about the figures
 * changes here. Only the shop's record of whether somebody has stood in
 * front of them, which they have.
 */
update menu_items mi
set cost_confirmed = true
from restaurants r
where r.id = mi.restaurant_id
  and r.name = 'KFC'
  and mi.available
  and mi.price_food > 0
  and mi.price_cost is not null;
