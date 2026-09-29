-- Pilot Meta Direct publishing queue for Proxsis Academy.
-- Tokens remain in Vercel environment variables and are never stored here.

create table if not exists public.meta_publish_jobs (
  id uuid primary key,
  brand_id text not null,
  brand_name text not null,
  brief_id text,
  instagram_account_id text not null,
  instagram_username text,
  caption text not null default '',
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'published', 'failed', 'cancelled')),
  meta_container_id text,
  meta_media_id text,
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  error_message text,
  created_by text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_publish_jobs_due_idx
  on public.meta_publish_jobs(status, next_attempt_at, scheduled_for);
create index if not exists meta_publish_jobs_brand_idx
  on public.meta_publish_jobs(brand_id, scheduled_for desc);

alter table public.meta_publish_jobs enable row level security;

-- The application only accesses this table from authenticated server routes
-- with the service role. No anon/authenticated direct-table policies are added.
