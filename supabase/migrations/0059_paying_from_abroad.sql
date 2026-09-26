-- Somebody abroad paying for a student here.
--
-- A parent in London or a sister in Houston wants to pay for their food, and
-- a Nigerian bank transfer is not something either of them can do. Stripe
-- takes the card in pounds or dollars; the link goes out by hand on WhatsApp
-- the same way a card link always has.
--
-- The currency lives on the order because it decides which link to send, and
-- getting that wrong means a payment in the wrong money that has to be sent
-- back. Empty is naira, which is nearly every order.
alter table orders
  add column if not exists pay_currency text not null default '';

comment on column orders.pay_currency is
  'GBP or USD when somebody abroad is paying through Stripe. Empty is naira.';

-- Switched on in admin, with the rate the shop is willing to honour. A live
-- rate moves between somebody reading a figure and sending the money, and
-- then the shop is short; this one is ours and it is quoted as "about".
alter table settings
  add column if not exists abroad_on text not null default '',
  add column if not exists gbp_rate text not null default '',
  add column if not exists usd_rate text not null default '';
