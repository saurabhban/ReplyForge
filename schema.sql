-- ReplyForge Database Schema
-- Run this in Supabase SQL Editor (free tier)

-- USERS TABLE
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text default 'free' check (plan in ('free', 'pro', 'team')),
  status text default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  api_key text unique default encode(gen_random_bytes(24), 'hex'),
  credits_used integer default 0,
  last_reset text,
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EMAILS TABLE (track generated emails for analytics)
create table if not exists emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  prospect_company text,
  prospect_role text,
  tone text,
  subject_line text,
  email_body text,
  was_copied boolean default false,
  created_at timestamptz default now()
);

-- TEMPLATES TABLE
create table if not exists templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  content text not null,
  tags text[],
  use_count integer default 0,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY
alter table users enable row level security;
alter table emails enable row level security;
alter table templates enable row level security;

-- Policies: users can only see their own data
create policy "users_own_data" on users for all using (auth.uid()::text = id::text);
create policy "emails_own_data" on emails for all using (
  user_id in (select id from users where email = auth.email())
);
create policy "templates_own_data" on templates for all using (
  user_id in (select id from users where email = auth.email())
);

-- INDEXES for performance
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_stripe_customer on users(stripe_customer_id);
create index if not exists idx_emails_user_id on emails(user_id);
create index if not exists idx_emails_created_at on emails(created_at desc);
