-- The card link the admin generates by hand and sends over WhatsApp. Keeping
-- it on the order means it can be sent again without generating a new one.
alter table orders add column if not exists payment_link text;

notify pgrst, 'reload schema';
