-- Join the room first, pay to be in the draw.
--
-- It used to be that a member row existed only once the money had arrived,
-- so joining had to happen in admin and the public page could only hand
-- somebody to WhatsApp. That made the rule true but made the room useless:
-- nobody could look at it, write a list, or see who else was in until
-- somebody had taken their money by hand, one person at a time.
--
-- So the rule moves one step down the line, to the place it was always
-- actually about. Anybody can be in a room. Only people who have paid are
-- drawn. The promise was never "only payers may look at this page", it was
-- "nobody gives a gift and receives nothing", and that is kept by the draw
-- and not by the door.
--
-- What enforces it is in closeRoom, which draws from paid members alone. A
-- room showing ten people and four paid draws four.
alter table santa_members drop constraint if exists santa_members_paid_check;

-- Nothing until they have paid something. Still never negative.
alter table santa_members alter column paid set default 0;
alter table santa_members add constraint santa_members_paid_check check (paid >= 0);

-- Null until the money lands, which is now the thing that distinguishes a
-- member from a member who is actually in the draw. A default of now()
-- would have said everybody had paid the moment they walked in.
alter table santa_members alter column paid_at drop not null;
alter table santa_members alter column paid_at drop default;
update santa_members set paid_at = null where paid = 0;

-- What they put in the transfer so we can tell whose money it is.
--
-- A bank statement says a name and an amount, and in a room where everyone
-- pays the same amount on the same week that is not enough to tell two
-- people apart, especially when the sender's name is their father's. Short
-- enough to type into a narration box without a mistake, and unique across
-- every room so the match is never ambiguous.
alter table santa_members add column if not exists reference text not null default '';

create unique index if not exists santa_members_reference_idx
  on santa_members (reference) where reference <> '';

-- Paid is paid_at being set, not paid being above zero: somebody could in
-- principle be let in free, and the date is what we would actually have.
comment on column santa_members.paid_at is
  'When their money landed. Null means not in the draw.';
