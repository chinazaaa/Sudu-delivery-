-- Whether this customer has already been asked, and said yes.
--
-- The customers list can send a review request on WhatsApp, and without
-- this there is no way to tell who has already left one. Asking the same
-- person every fortnight is how a shop stops being read at all.
--
-- Ticked by hand, because Google does not say who wrote a review and we are
-- never going to guess from a first name.
alter table customers add column if not exists reviewed_at timestamptz;
