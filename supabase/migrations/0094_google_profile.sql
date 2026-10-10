-- Where to find us on Google, and where to leave us a review.
--
-- Two links rather than one: the profile is the thing to show people, and
-- the review link is the one that opens the box they type in. They are
-- different URLs and Google gives them out in different places, so guessing
-- one from the other would send somebody to the wrong page.
--
-- Empty means we are not on Google as far as this shop is concerned, and
-- every piece of the site that would have mentioned it hides itself.
alter table settings
  add column if not exists google_profile text not null default '',
  add column if not exists google_review text not null default '';
