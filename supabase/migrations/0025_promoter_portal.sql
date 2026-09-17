-- A promoter signs in with their code and a four-digit PIN, the same way a
-- customer opens their order history.
alter table promoters add column if not exists pin text not null default '';

-- What has actually been handed over, so "owed" means what is still owed
-- rather than everything ever earned.
create table if not exists promoter_payouts (
  id            uuid primary key default gen_random_uuid(),
  promoter_code text not null references promoters(code) on delete cascade,
  amount        int not null check (amount > 0),
  note          text not null default '',
  paid_at       timestamptz not null default now()
);
create index if not exists promoter_payouts_code_idx
  on promoter_payouts (promoter_code, paid_at desc);
alter table promoter_payouts enable row level security;

-- Anyone without a PIN gets one, so an existing promoter can sign in.
update promoters
set pin = lpad((floor(random() * 10000))::int::text, 4, '0')
where pin = '';

notify pgrst, 'reload schema';
