-- Everything the promoter pages need.
--
-- The PIN column and the payouts table arrived after the first schema, so a
-- database set up before then has the promoters table but not these. Without
-- them, saving a promoter writes nothing and the form comes back empty.
--
-- Safe to run twice. Nothing here touches an existing promoter.

-- How a promoter signs in at /promoter, with their code.
alter table promoters add column if not exists pin text not null default '';

-- What you have actually handed over, so owed means something.
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

-- Anyone already there without a PIN gets one, so they can sign in.
update promoters
set pin = lpad((floor(random() * 10000))::int::text, 4, '0')
where pin = '';

-- Supabase caches the schema, and this makes the new column visible at once.
notify pgrst, 'reload schema';

-- What you should see: every promoter with a four digit PIN.
select code, name, pin, rate, active from promoters order by code;
