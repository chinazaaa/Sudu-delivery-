-- Payment details the admin edits from the UK, rather than environment
-- variables that need a redeploy to change.

create table settings (
  -- One row, forever. The check constraint is what keeps it that way.
  id                  boolean primary key default true check (id),
  bank_name           text not null default '',
  bank_account_name   text not null default '',
  bank_account_number text not null default '',
  -- Card payers are sent here to be handled by hand.
  whatsapp_number     text not null default '',
  card_note           text not null default
    'Paying by card? Message us on WhatsApp and we will send you a card link.',
  updated_at          timestamptz not null default now()
);

insert into settings (id) values (true);

alter table settings enable row level security;
