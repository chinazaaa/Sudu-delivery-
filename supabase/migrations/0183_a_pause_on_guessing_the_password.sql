-- A pause between wrong admin passwords.
--
-- A customer's four digit PIN already gets five tries and then a quarter
-- of an hour's rest. The admin password, which opens the whole shop, got
-- nothing: it could be guessed as fast as a machine could ask.
--
-- One row, because there is one password. Counting per address would be
-- kinder to the owner and useless against the attack, since the address a
-- request claims to come from is a header.
--
-- Deliberately a pause rather than a lockout. There is one admin, and
-- somebody hammering the login must not be able to shut the shop's owner
-- out of her own board on a Saturday evening. Five wrong tries buys sixty
-- seconds, which is nothing to a person who mistyped and ruinous to a
-- machine: it caps guessing at five a minute instead of thousands.
create table if not exists admin_gate (
  id boolean primary key default true,
  fails integer not null default 0,
  locked_until timestamptz,
  constraint admin_gate_one_row check (id)
);

insert into admin_gate (id, fails) values (true, 0) on conflict (id) do nothing;

comment on table admin_gate is
  'How many admin passwords have been got wrong in a row, and until when the next try must wait. One row.';

-- Like every other table here. Nothing but the server's own key ever
-- reaches this, but a table outside the rule is a table somebody has to
-- remember is outside the rule.
alter table admin_gate enable row level security;
