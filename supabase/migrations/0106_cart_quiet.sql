-- Two of the five reasons a cart gets closed promise a consequence, and
-- until now nothing carried it out.
--
-- "Not interested" means stop nudging this person for a fortnight, and
-- "Wrong number" means never nudge this number again. Both are about a
-- phone number rather than about one cart, so both are read across every
-- cart that number has.
--
-- On carts and not on customers, because the people this is about are
-- mostly not customers: a customers row is written on a first order, and
-- somebody who filled a cart and never paid has no row there to mark. The
-- cart is the only record of them the shop holds, so the mark lives on the
-- cart that recorded the decision and the rule is applied by phone.
alter table carts add column if not exists quiet_until timestamptz;
alter table carts add column if not exists bad_number boolean not null default false;

comment on column carts.quiet_until is
  'Nothing is nudged to this number until this moment. Set a fortnight out when somebody says they are not interested.';
comment on column carts.bad_number is
  'The number does not work. Nothing is ever nudged to it again, until somebody undoes it.';

-- The list of numbers to leave alone is read on every pass over the
-- abandoned carts, and it is a handful of rows out of all of them.
create index if not exists carts_hushed_idx
  on carts (phone)
  where bad_number or quiet_until is not null;

notify pgrst, 'reload schema';
