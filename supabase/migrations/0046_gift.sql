-- Buying for somebody else.
--
-- Two different people on one order. Whoever pays is the customer: they get
-- the account details, the card link, the PIN and every message about money,
-- because it is their money. Whoever eats is somewhere else entirely, with
-- their own number for the call when the food is at their block.
--
-- Kept beside the customer rather than replacing them. An order that
-- overwrote the payer with the recipient would lose the only person who can
-- be chased for payment, and would send a stranger a PIN that is not theirs.
alter table orders
  add column if not exists deliver_to_name text,
  add column if not exists deliver_to_phone text;

-- The block is already on the order and is where it goes either way, so a
-- gift simply puts the recipient's block there. Nothing needs adding for it.
