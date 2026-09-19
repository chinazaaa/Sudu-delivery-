-- The wording for asking somebody how the food was.
--
-- A delivered order has nothing left to say about payment or lateness, so
-- the one message worth offering on it is this one.
alter table settings add column if not exists msg_review text not null default '';

notify pgrst, 'reload schema';
