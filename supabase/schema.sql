create extension if not exists pgcrypto;

create table users (
  id bigint primary key,                 -- Telegram user id
  first_name text, username text, photo_url text,
  wallet text,
  terms_accepted_at timestamptz,
  notify_status text,                    -- null = not asked yet, 'allowed' or 'declined'
  welcomed_at timestamptz,
  referred_by bigint references users(id),
  created_at timestamptz default now()
);
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id) not null,
  signature text unique not null,        -- unique = a trade can't be recorded twice
  kind text not null check (kind in ('open','close')),
  side text not null,
  position_usd numeric not null, leverage numeric,
  fee_rate numeric not null, fee_usd numeric not null,
  created_at timestamptz default now()
);
create table referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id bigint references users(id) not null,
  referred_id bigint references users(id) not null,
  trade_id uuid references trades(id) unique not null,
  amount_usd numeric not null,
  created_at timestamptz default now()
);
create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id) not null,
  amount_usd numeric not null, fee_usd numeric not null, payout_usd numeric not null,
  wallet text not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  signature text, gas_lamports bigint,
  created_at timestamptz default now(), processed_at timestamptz
);
create table trade_intents (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references users(id) not null,
  kind text not null, side text not null,
  position_usd numeric not null, leverage numeric, fee_rate numeric not null, fee_usd numeric not null,
  ix_sigs jsonb not null,                -- the instructions the server built; the landed tx must contain them
  used boolean not null default false,
  created_at timestamptz default now()
);
create table settings (key text primary key, value text not null);
insert into settings (key, value) values
  ('fee_rate','0.005'), ('referral_share','0.20'), ('min_order_usd','10'),
  ('max_leverage','10'), ('min_withdraw_usd','20'), ('withdrawal_fee_usd','0.50');

-- RLS on with no policies: only the server's service-role key can read/write.
alter table users enable row level security;
alter table trades enable row level security;
alter table referral_earnings enable row level security;
alter table withdrawals enable row level security;
alter table settings enable row level security;
alter table trade_intents enable row level security;
