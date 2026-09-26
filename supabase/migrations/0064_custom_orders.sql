-- An order that is not finished being agreed.
--
-- A box is written at a high level: "a cake", "a flower". The conversation
-- on WhatsApp is where it becomes a twelve inch vanilla cake with something
-- written on it, or a card instead of the flower, and that conversation
-- changes the price.
--
-- So an order can be placed knowing the total is provisional. It says so to
-- the customer rather than quietly being wrong, and admin settles it by
-- editing what is actually in the order.
alter table orders
  add column if not exists custom_pending boolean not null default false;

-- What was actually taken, at the moment it was marked paid. Without it, an
-- order edited after payment loses the only record of what the customer
-- handed over, and nobody can say who owes whom.
alter table orders
  add column if not exists charged integer;
