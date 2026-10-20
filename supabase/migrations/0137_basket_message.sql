-- The wording for a basket somebody left, priced up and sent back to them.
--
-- Every other message the shop sends is about an order that already exists.
-- This one is about a basket that never became one: it has to read the
-- contents back before it names a price, because the person filled it days
-- ago and will not remember what was in it.
alter table settings add column if not exists msg_basket text not null default '';
