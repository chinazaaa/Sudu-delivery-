-- Email sent to the shop, and what was said back.
--
-- hello@sudu.store has always arrived at Resend and could only be read
-- there, which is a second place to remember to look and no way to answer
-- from the screen where everything else about a customer already is.
--
-- A row per message, written by the webhook. The body is fetched in a second
-- call, because the webhook carries only the envelope: who it is from, who
-- it is to, the subject, and a description of each attachment.
create table if not exists mail (
  id uuid primary key default gen_random_uuid(),
  -- Resend's own id for the received email. Unique, because a webhook that
  -- is not answered quickly enough is sent again, and the same letter
  -- arriving twice should be one row.
  email_id text not null unique,
  -- The RFC message id, which is what a reply quotes to stay in the same
  -- conversation in whatever mail client they are reading it in.
  message_id text not null default '',
  from_addr text not null default '',
  to_addr text not null default '',
  cc_addr text not null default '',
  subject text not null default '',
  text_body text not null default '',
  html_body text not null default '',
  -- Name, type and size only. The files stay at Resend behind a link that
  -- expires, so there is nothing here worth keeping a copy of.
  attachments jsonb not null default '[]'::jsonb,
  -- What the sending domain said about itself. Worth keeping beside a
  -- letter claiming to be a bank.
  spf text not null default '',
  dkim text not null default '',
  dmarc text not null default '',
  received_at timestamptz not null default now(),
  read_at timestamptz,
  -- Answered, or deliberately not: both are decisions and both stop a
  -- letter from counting as waiting.
  replied_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mail_received on mail (received_at desc);
create index if not exists mail_waiting on mail (received_at desc)
  where done_at is null and replied_at is null;

alter table mail enable row level security;

-- What was sent back, kept because a reply is part of the record and the
-- next person to open this should see the whole conversation.
create table if not exists mail_replies (
  id uuid primary key default gen_random_uuid(),
  mail_id uuid not null references mail(id) on delete cascade,
  body text not null default '',
  -- Resend's id for the outgoing message, so a reply that did not arrive
  -- can be looked up at the provider.
  sent_id text not null default '',
  sent_at timestamptz not null default now()
);

create index if not exists mail_replies_of on mail_replies (mail_id, sent_at);

alter table mail_replies enable row level security;
