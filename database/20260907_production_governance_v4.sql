-- Combined Dashboard — Production Governance v4
-- Additive only. Safe for the same Supabase project used by SMM Simplified.
-- Does not alter SMM core tables or existing RLS.

create table if not exists public.workspace_settings(
  id text primary key,
  timezone text not null default 'Asia/Jakarta',
  default_objective text not null default 'awareness + consideration',
  default_cta text not null default 'Pelajari lebih lanjut',
  default_format text not null default 'auto' check(default_format in ('auto','carousel','reels','single_post')),
  story_qc_threshold integer not null default 90 check(story_qc_threshold between 0 and 100),
  brand_alignment_threshold integer not null default 85 check(brand_alignment_threshold between 0 and 100),
  derivative_alignment_threshold integer not null default 85 check(derivative_alignment_threshold between 0 and 100),
  calendar_default_scope text not null default 'active_brand' check(calendar_default_scope in ('active_brand','all_brands')),
  auto_ready_to_design boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.workspace_settings enable row level security;

do $$ begin
  create policy "combined settings read" on public.workspace_settings
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "combined settings write" on public.workspace_settings
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

insert into public.workspace_settings(id)
values ('default')
on conflict (id) do nothing;
