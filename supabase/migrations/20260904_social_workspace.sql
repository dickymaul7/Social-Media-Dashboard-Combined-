create table if not exists public.social_calendar_items (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null,
  content_date date not null,
  content_type text not null,
  title text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_calendar_items_brand_date_idx
  on public.social_calendar_items (brand_id, content_date);

create table if not exists public.workspace_links (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null,
  label text not null,
  url text not null,
  category text not null default 'Planning',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_links_brand_idx
  on public.workspace_links (brand_id);

alter table public.social_calendar_items enable row level security;
alter table public.workspace_links enable row level security;

-- Policies are intentionally not opened to anonymous writes here.
-- Add authenticated brand-membership policies after the Combined app auth model is wired.
