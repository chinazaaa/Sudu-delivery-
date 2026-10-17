-- Whoever pays for this one.
--
-- At a university where the fees are what they are, a student may well be
-- paying for their own food, so this is never assumed and never shown to
-- the customer. It is written down when somebody says so: "my mum will pay
-- for the monthly one", which is the sentence that turns a student into
-- an introduction to the person this shop most wants to reach.
--
-- Kept on the customer rather than on an order, because it is true of the
-- person rather than of one bag of rice.
alter table customers add column if not exists parent_name text not null default '';
alter table customers add column if not exists parent_phone text not null default '';
