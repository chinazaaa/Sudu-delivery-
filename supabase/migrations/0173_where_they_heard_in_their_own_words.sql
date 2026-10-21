-- Where they heard about us, in their own words.
--
-- "Where did you hear about us?" offers a list and a way out called
-- "Somewhere else", and somewhere else recorded nothing at all. That was
-- survivable while the list was nine promoters and a channel. With the
-- list down to one name and ChatGPT, somewhere else is the answer most
-- people will give, and the shop would be asking its best question and
-- throwing the answer away.
--
-- The channel column cannot hold it: that one is tidied against a known
-- set so that ig-bio and instagram_story land under Instagram, and
-- anything it does not recognise becomes nothing. "My roommate" would be
-- nothing. So the sentence gets a column of its own and keeps the
-- spelling, the capitals and the block name exactly as typed.
--
-- Written once, on a first order, and never touched after: the same rule
-- as the promoter beside it. Whatever introduced somebody introduced them
-- once, and the orders after that are nobody else's doing.
alter table customers
  add column if not exists heard_said text not null default '';

comment on column customers.heard_said is
  'What they typed into "Somewhere else" when asked where they heard about us. Their words, untouched. Written on a first order only.';
