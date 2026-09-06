-- Full SMM parity persistence foundation
-- Run in Supabase SQL Editor after configuring NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

create table if not exists public.brands(id text primary key,name text not null,website text,status text not null default 'active',created_at timestamptz not null default now());
create table if not exists public.workspace_users(id text primary key,name text not null default '',email text not null default '',role text not null default 'viewer',brand_ids jsonb not null default '[]'::jsonb,permissions jsonb not null default '[]'::jsonb,status text not null default 'active');
create table if not exists public.smm_campaigns(id text primary key,brand_id text,payload jsonb not null,created_at timestamptz not null default now());
create index if not exists smm_campaigns_brand_idx on public.smm_campaigns(brand_id,created_at desc);
create table if not exists public.smm_briefs(id text primary key,brand_id text,campaign_id text,payload jsonb not null,updated_at timestamptz not null default now());
create index if not exists smm_briefs_brand_idx on public.smm_briefs(brand_id,updated_at desc);
create table if not exists public.content_expansions(brief_id text not null,channel text not null check(channel in ('linkedin','seo_geo')),brand_id text,content jsonb not null,master_updated_at timestamptz,updated_at timestamptz not null default now(),primary key(brief_id,channel));
create table if not exists public.content_expansion_meta(brief_id text not null,channel text not null check(channel in ('linkedin','seo_geo')),scheduled_for date,human_qc text not null default 'pending',human_qc_at timestamptz,alignment jsonb,master_updated_at timestamptz,updated_at timestamptz not null default now(),primary key(brief_id,channel));
create table if not exists public.expansion_calendar(id text primary key,brief_id text not null,brand_id text,brand_name text not null,channel text not null check(channel in ('linkedin','seo_geo')),title text not null,scheduled_for date not null,updated_at timestamptz not null default now());
create index if not exists expansion_calendar_brand_idx on public.expansion_calendar(brand_id,scheduled_for);
create table if not exists public.workspace_tasks(id text primary key,brand_id text not null,title text not null,description text,brief_id text,channel text,assignee text,due_date date,status text not null default 'todo',priority text not null default 'medium',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists workspace_tasks_brand_idx on public.workspace_tasks(brand_id,due_date);create index if not exists workspace_tasks_assignee_idx on public.workspace_tasks(assignee,status);

alter table public.brands enable row level security;alter table public.workspace_users enable row level security;alter table public.smm_campaigns enable row level security;alter table public.smm_briefs enable row level security;alter table public.content_expansions enable row level security;alter table public.content_expansion_meta enable row level security;alter table public.expansion_calendar enable row level security;alter table public.workspace_tasks enable row level security;

-- Safe authenticated-user baseline. Tighten policies to role/brand memberships after the first admins are populated.
do $$ begin create policy "authenticated brands read" on public.brands for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated brands write" on public.brands for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated workspace users read" on public.workspace_users for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated workspace users write" on public.workspace_users for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated campaigns" on public.smm_campaigns for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated briefs" on public.smm_briefs for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated derivative content" on public.content_expansions for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated expansion meta" on public.content_expansion_meta for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated expansion calendar" on public.expansion_calendar for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated tasks" on public.workspace_tasks for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;

-- Local-mode / anon writes are intentionally not enabled. Until Supabase Auth is configured,
-- the app keeps browser storage as its source and remote sync remains optional.
