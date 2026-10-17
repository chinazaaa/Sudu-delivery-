-- The message that tells a customer about Sudu for parents, and where a
-- standing order came from.
alter table settings add column if not exists msg_parents text not null default '';
alter table plans add column if not exists came_from text not null default '';
