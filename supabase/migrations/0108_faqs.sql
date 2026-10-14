-- What the chat is allowed to say.
--
-- Sudu Bot has no model in it, which is the point: it cannot invent a
-- delivery fee, a refund policy or an opening time, and it will never tell
-- a customer something this shop did not say. The cost of that is that it
-- can only answer what it has been given, and this is where it is given.
--
-- The list is meant to grow sideways rather than be written in one sitting.
-- A question it could not answer lands in custom_requests marked as a
-- question; somebody answers that person properly on WhatsApp and presses
-- "Make this a chat answer"; from then on the next person asking it is
-- answered in a second. from_request_id is the thread back to where an
-- entry came from.
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- What somebody asks, in their words. Shown in admin and matched against.
  question text not null default '',
  -- The answer the chat says back.
  answer text not null default '',
  -- Other ways of asking the same thing, comma separated. The matcher reads
  -- these as part of the question, which is how "how much is delivery",
  -- "what are your fees" and "delivery price" all reach one answer rather
  -- than needing three entries.
  keywords text not null default '',
  active boolean not null default true,
  sort_order integer not null default 100,
  -- How many times the chat has answered with this, so the list can be
  -- ordered by what people actually ask rather than by what somebody
  -- imagined they would.
  asked_count integer not null default 0,
  -- The request this was written from, where it came from somebody asking
  -- something the chat could not answer.
  from_request_id uuid
);

create index if not exists faqs_active_idx on faqs (active, sort_order);

alter table faqs enable row level security;
