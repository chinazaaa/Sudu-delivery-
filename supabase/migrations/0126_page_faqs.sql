-- The questions on the landing pages, editable without a deploy.
--
-- Not the `faqs` table, which is the chat's: those are things Sudu Bot is
-- allowed to say, matched on keywords and answered one at a time. These
-- are the question-and-answer sections printed down the bottom of the five
-- landing pages and marked up for Google underneath. Different job,
-- different shape, so a table of their own.
--
-- There are thirty-nine of them and every one was written into its page,
-- so changing a sentence meant changing code. The first answer on the
-- parents page said we buy the food in Sangotedo, which is where most of
-- it comes from and not all of it, and a parent whose child wants
-- something from Lekki reads that as "we do not go there". That is a
-- sentence somebody should be able to fix in a minute.
--
-- Kept as an override rather than as the text itself. Half these answers
-- are built from live numbers: the cheapest delivery fee, which routes are
-- running, whether we are collecting parcels at all. If a page simply read
-- its words from here, the first edit would freeze a price into a
-- paragraph and it would go quietly wrong the day the price changed. So
-- the page goes on writing its own wording into default_q and default_a,
-- and these columns say only where somebody wanted something different.
-- An empty override means the automatic wording, which is why putting it
-- back is just clearing a box.
create table if not exists page_faqs (
  page text not null,
  key text not null,
  -- What the page itself would say, rewritten whenever the page changes
  -- its mind. Never edited by hand: it is what the editor shows as the
  -- wording an override is replacing, and what it offers back.
  default_q text not null default '',
  default_a text not null default '',
  -- What somebody wanted instead. Empty means use the default above.
  question text not null default '',
  answer text not null default '',
  -- Taken off the page, without losing the wording.
  hidden boolean not null default false,
  -- Added by hand rather than coming from the page, so it has no default
  -- to fall back to and is ordered by sort alone.
  custom boolean not null default false,
  sort integer not null default 0,
  primary key (page, key)
);
