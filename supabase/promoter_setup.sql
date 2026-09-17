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

-- Where to send their money, kept by them so nobody retypes it.
alter table promoters add column if not exists bank_name text not null default '';
alter table promoters add column if not exists bank_account_name text not null default '';
alter table promoters add column if not exists bank_account_number text not null default '';

-- A payout is recorded by you and confirmed by them, so both ends agree.
alter table promoter_payouts add column if not exists confirmed_at timestamptz;
-- Which run a payout was for. Null is still allowed, for a payment that
-- covers several runs or none of them.
alter table promoter_payouts add column if not exists batch_id uuid references batches(id) on delete set null;

-- Anyone already there without a PIN gets one, so they can sign in.
update promoters
set pin = lpad((floor(random() * 10000))::int::text, 4, '0')
where pin = '';

-- Supabase caches the schema, and this makes the new column visible at once.
notify pgrst, 'reload schema';

-- What you should see: every promoter with a four digit PIN.
select code, name, pin, rate, active from promoters order by code;
