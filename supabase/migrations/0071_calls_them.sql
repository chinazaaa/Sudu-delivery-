-- What to greet somebody as.
--
-- Templates opened "Hi Amieghe Kayla", which is nobody's idea of how a person
-- is addressed, and the obvious fix of taking the first word is wrong about
-- half the time here: names are entered first-name-first and surname-first in
-- equal measure, so the first word is as likely to be a surname as a given
-- name. Greeting somebody by their surname is worse than greeting them by
-- both.
--
-- So the first word is the default and this is the override, set once per
-- person in the customer book. Empty means use the first word.
alter table customers add column if not exists calls_them text not null default '';

comment on column customers.calls_them is
  'What to greet this person as. Empty means the first word of their name.';
