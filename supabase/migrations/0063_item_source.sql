-- Where to go and get it.
--
-- Half of what a collection holds is not on anybody's menu: a cake, a bunch
-- of flowers, a bucket. Somebody found it somewhere for a price, and when an
-- order comes in the person packing it needs to know where that was. A shop
-- name, a phone number, a link, a note about what it cost there.
--
-- Never shown to a customer. It is the back of the product, not the front.
alter table menu_items
  add column if not exists source text not null default '';
