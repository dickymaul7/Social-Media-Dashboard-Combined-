-- Combined Dashboard — additive persistence for the EXISTING SMM Simplified Supabase project
-- IMPORTANT:
-- 1) This migration intentionally DOES NOT create, alter, or change RLS/policies on existing SMM core tables.
-- 2) Existing SMM tables such as brands, campaigns, content_briefs, brief_sections, profiles,
--    roles, permissions, user_roles, and user_brand_access remain the source of truth for SMM data.
-- 3) Run this once in the SAME Supabase project used by SMM Simplified.

-- Combined-specific persistence tables only. brand_id is stored as text so existing UUID brand IDs
-- can be represented without changing the SMM brands table.
create table if not exists public.workspace_users(
  id text primary key,
  name text not null default '',
  email text not null default '',
  role text not null default 'viewer',
  brand_ids jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '[]'::jsonb,
  status text not null default 'active'
);

create table if not exists public.smm_campaigns(
  id text primary key,
  brand_id text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists smm_campaigns_brand_idx on public.smm_campaigns(brand_id,created_at desc);

create table if not exists public.smm_briefs(
  id text primary key,
  brand_id text,
  campaign_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists smm_briefs_brand_idx on public.smm_briefs(brand_id,updated_at desc);

create table if not exists public.content_expansions(
  brief_id text not null,
  channel text not null check(channel in ('linkedin','seo_geo')),
  brand_id text,
  content jsonb not null,
  master_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(brief_id,channel)
);

create table if not exists public.content_expansion_meta(
  brief_id text not null,
  channel text not null check(channel in ('linkedin','seo_geo')),
  scheduled_for date,
  human_qc text not null default 'pending',
  human_qc_at timestamptz,
  alignment jsonb,
  master_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(brief_id,channel)
);

create table if not exists public.expansion_calendar(
  id text primary key,
  brief_id text not null,
  brand_id text,
  brand_name text not null,
  channel text not null check(channel in ('linkedin','seo_geo')),
  title text not null,
  scheduled_for date not null,
  updated_at timestamptz not null default now()
);
create index if not exists expansion_calendar_brand_idx on public.expansion_calendar(brand_id,scheduled_for);

create table if not exists public.workspace_tasks(
  id text primary key,
  brand_id text not null,
  title text not null,
  description text,
  brief_id text,
  channel text,
  assignee text,
  due_date date,
  status text not null default 'todo',
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_tasks_brand_idx on public.workspace_tasks(brand_id,due_date);
create index if not exists workspace_tasks_assignee_idx on public.workspace_tasks(assignee,status);

-- RLS applies ONLY to the Combined-specific tables above.
alter table public.workspace_users enable row level security;
alter table public.smm_campaigns enable row level security;
alter table public.smm_briefs enable row level security;
alter table public.content_expansions enable row level security;
alter table public.content_expansion_meta enable row level security;
alter table public.expansion_calendar enable row level security;
alter table public.workspace_tasks enable row level security;

-- Authenticated-user baseline for Combined-only tables.
-- Existing SMM Simplified core-table RLS is deliberately untouched.
do $$ begin
  create policy "combined workspace users read" on public.workspace_users for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined workspace users write" on public.workspace_users for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined campaigns" on public.smm_campaigns for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined briefs" on public.smm_briefs for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined derivative content" on public.content_expansions for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined expansion meta" on public.content_expansion_meta for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined expansion calendar" on public.expansion_calendar for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "combined tasks" on public.workspace_tasks for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- No anon policies are added. Existing SMM core schema and RLS remain unchanged.
