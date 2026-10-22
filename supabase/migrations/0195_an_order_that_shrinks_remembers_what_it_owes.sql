/*
 * An order that shrinks remembers what it owes.
 *
 * Taking a line off an order already worked: the counter has sold its last
 * chicken pie, the pie comes off, and the order adds itself up again. What
 * did not work was the money. The total dropped from 14,400 to 13,000 and
 * the 1,400 the customer had already paid for the pie existed nowhere: not
 * on her page, not on the run's sheet, not in anybody's head by morning.
 *
 * orders.refund_owed was already here, written only by a shared delivery
 * shrinking and read in two places. It becomes the general answer, and it
 * needs two things it did not have: a reason, so the customer is told why
 * rather than just shown a figure, and a mark for having been paid back,
 * so the list of what the shop owes is a list that can empty.
 */
alter table orders
  add column if not exists refund_said text not null default '',
  add column if not exists refund_paid_at timestamptz;

comment on column orders.refund_said is
  'Why money is owed back. Shown to the customer on their own order page.';
comment on column orders.refund_paid_at is
  'When the shop actually sent it back. Null while it is still owed.';
