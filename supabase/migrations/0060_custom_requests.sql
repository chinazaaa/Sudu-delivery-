-- Somebody asking for something the shop does not carry.
--
-- "A black 20,000mAh power bank" is not on any menu here and might never be,
-- but somebody wanting one is worth knowing about: a request is a customer
-- saying what they would pay for, which is the cheapest market research
-- there is. Enough of the same request and it becomes a product.
--
-- Answered by hand on WhatsApp, like everything else here. Nothing about
-- this is a marketplace.
create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- What they asked for, in their own words.
  wanted text not null,
  -- What they are willing to spend, where they said. Free text: "about 20k"
  -- is an answer, and a number box would refuse it.
  budget text not null default '',
  name text not null,
  phone text not null,
  hostel text not null default '',
  note text not null default '',
  -- 'new', 'quoted', 'done', 'dropped'.
  status text not null default 'new',
  admin_note text not null default '',
  -- What it was quoted at, once it has been. Naira.
  quoted integer,
  answered_at timestamptz
);

create index if not exists custom_requests_new_idx on custom_requests (created_at desc);
