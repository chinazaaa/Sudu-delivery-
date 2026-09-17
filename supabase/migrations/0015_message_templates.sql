-- Every message the admin sends, and the lines the customer reads after
-- paying, kept as editable copy rather than words baked into the code.
alter table settings add column if not exists msg_confirmed text not null default '';
alter table settings add column if not exists msg_payment   text not null default '';
alter table settings add column if not exists msg_card      text not null default '';
alter table settings add column if not exists msg_pin       text not null default '';
alter table settings add column if not exists msg_ready     text not null default '';
alter table settings add column if not exists msg_late      text not null default '';
-- What a paid customer is told on their order page.
alter table settings add column if not exists paid_note     text not null default '';

notify pgrst, 'reload schema';
