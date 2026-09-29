-- Where somebody came from, and a link short enough to share.
--
-- Two separate questions that got confused for one. "Who brought you" is a
-- promoter and is already answered by promoters.code on the customer. "Where
-- were you when you saw us" is Google, or Instagram, or a poster, and was
-- answered nowhere: the referrer went into page_views and stopped there, so
-- a Google search that ended in an order looked exactly like a direct visit.

-- The short name in a promoter's own link: sudu.store/s/ada. Their code is
-- the thing everything else joins on and may be ugly; this is the thing
-- somebody types into a group chat, so it can be changed without breaking a
-- single order. Unique without regard to case, because ADA and ada are the
-- same girl and only one of them can have the link.
alter table promoters add column if not exists handle text not null default '';

create unique index if not exists promoters_handle_idx
  on promoters (lower(handle))
  where handle <> '';

-- The channel, on the order itself, so a month can be counted by where its
-- orders came from rather than by how many strangers looked at the menu.
alter table orders add column if not exists came_from text not null default '';

-- And on the customer, written on the first order and never again, the same
-- way the promoter is: the thing that introduced somebody introduced them
-- once, and every order after that is not Google's doing.
alter table customers add column if not exists came_from text not null default '';

-- On the view too, so the top of the funnel and the bottom are counted the
-- same way and can honestly be put beside each other.
alter table page_views add column if not exists came_from text not null default '';

create index if not exists orders_came_from_idx on orders (came_from) where came_from <> '';

-- Everybody promoting already has a link, rather than only the ones somebody
-- remembers to fill the box in for. Their code, lower cased, which is what
-- they would have picked anyway.
update promoters
set handle = regexp_replace(lower(code), '[^a-z0-9]', '', 'g')
where coalesce(handle, '') = ''
  and regexp_replace(lower(code), '[^a-z0-9]', '', 'g') <> '';
