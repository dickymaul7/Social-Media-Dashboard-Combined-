-- Combined Dashboard — SMM persistence + access foundation
-- Additive migration. Designed to coexist with the current browser-storage fallback.
-- Active Brand IDs in Combined are text slugs, so brand scope remains TEXT in this bridge layer.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_brand_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);

create table if not exists public.user_permission_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

-- JSONB bridge tables preserve the working Combined client object contracts.
create table if not exists public.smm_campaigns (
  id text primary key,
  brand_id text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  topic text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smm_campaigns_brand_created_idx
  on public.smm_campaigns (brand_id, created_at desc);

create table if not exists public.smm_briefs (
  id text primary key,
  campaign_id text not null references public.smm_campaigns(id) on delete cascade,
  brand_id text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  scheduled_for date,
  human_qc_status text not null default 'pending' check (human_qc_status in ('pending','approved')),
  production_status text not null default 'draft' check (production_status in ('draft','ready_to_design','designed')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smm_briefs_brand_schedule_idx
  on public.smm_briefs (brand_id, scheduled_for);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  brief_id text not null references public.smm_briefs(id) on delete cascade,
  brand_id text not null,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'todo' check (status in ('todo','in_progress','review','completed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_assignments_user_status_idx
  on public.task_assignments (assigned_to, status);
create index if not exists task_assignments_brand_idx
  on public.task_assignments (brand_id);

insert into public.roles (key,name,description)
values
  ('super_admin','Super Admin','Full workspace, user, brand, and system access.'),
  ('manager','Manager / Social Media Lead','Runs content operations, QC, calendar, brand intelligence, and analytics.'),
  ('content_writer','Content Writer / Strategist','Researches, generates, and edits storytelling briefs.'),
  ('designer','Designer','Reads briefs and manages design production status and links.'),
  ('viewer','Viewer / Client','Read-only access to permitted brand workspaces.')
on conflict (key) do update set name=excluded.name, description=excluded.description;

insert into public.permissions (key,module,name,description)
values
  ('overview.view','overview','View Overview','View dashboard overview.'),
  ('brief.view','brief','View Briefs','Open Story Angles and Full Briefs.'),
  ('brief.create','brief','Create Brief','Create a new Quick Brief workflow.'),
  ('brief.ai_generate','brief','Generate with AI','Run AI research, Story Angles, and brief generation.'),
  ('brief.edit','brief','Edit Brief','Edit Full Brief content and sequence.'),
  ('brief.improve','brief','Improve Brief','Run AI Improve.'),
  ('brief.qc','brief','Human QC','Approve Human QC.'),
  ('calendar.view','calendar','View Calendar','View scheduled content.'),
  ('calendar.schedule','calendar','Schedule Brief','Set publication date.'),
  ('calendar.reschedule','calendar','Reschedule Content','Move scheduled content.'),
  ('design.view','design','View Design Workflow','View design status and file links.'),
  ('design.update_status','design','Update Design Status','Change Ready to Design / Designed.'),
  ('design.update_link','design','Update Design Link','Change external design-file URL.'),
  ('brand.view','brand','View Brand Intelligence','Read brand intelligence.'),
  ('brand.edit','brand','Edit Brand Intelligence','Edit brand intelligence.'),
  ('brand.upload','brand','Upload Brand Sources','Upload sources for AI extraction.'),
  ('analytics.view','analytics','View Analytics','View analytics modules.'),
  ('analytics.export','analytics','Export Analytics','Export reports.'),
  ('users.view','users','View Users','View users and access.'),
  ('users.manage','users','Manage Users','Change roles and brand access.'),
  ('settings.manage','settings','Manage Settings','Change workspace settings.')
on conflict (key) do update set module=excluded.module,name=excluded.name,description=excluded.description;

-- Rebuild preset permission bundles only; user overrides remain untouched.
delete from public.role_permissions rp using public.roles r
where rp.role_id=r.id and r.key in ('super_admin','manager','content_writer','designer','viewer');

insert into public.role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true from public.roles r cross join public.permissions p where r.key='super_admin';

insert into public.role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true from public.roles r join public.permissions p on p.key = any(array[
  'overview.view','brief.view','brief.create','brief.ai_generate','brief.edit','brief.improve','brief.qc',
  'calendar.view','calendar.schedule','calendar.reschedule','design.view','design.update_status','design.update_link',
  'brand.view','brand.edit','brand.upload','analytics.view','analytics.export'
]) where r.key='manager';

insert into public.role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true from public.roles r join public.permissions p on p.key = any(array[
  'overview.view','brief.view','brief.create','brief.ai_generate','brief.edit','brief.improve','calendar.view','design.view','brand.view'
]) where r.key='content_writer';

insert into public.role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true from public.roles r join public.permissions p on p.key = any(array[
  'overview.view','brief.view','calendar.view','design.view','design.update_status','design.update_link','brand.view'
]) where r.key='designer';

insert into public.role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true from public.roles r join public.permissions p on p.key = any(array[
  'overview.view','brief.view','calendar.view','design.view','brand.view','analytics.view'
]) where r.key='viewer';

-- Safe bootstrap for a brand-new single-owner project.
do $$
declare v_user uuid; v_role uuid;
begin
  if (select count(*) from auth.users)=1 and not exists(select 1 from public.user_roles) then
    select id into v_user from auth.users order by created_at asc limit 1;
    select id into v_role from public.roles where key='super_admin';
    if v_user is not null and v_role is not null then
      insert into public.user_roles(user_id,role_id) values(v_user,v_role) on conflict(user_id) do nothing;
    end if;
  end if;
end $$;

create or replace function public.combined_is_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    where ur.user_id=auth.uid() and r.key='super_admin'
  );
$$;

create or replace function public.combined_has_brand_access(target_brand_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.combined_is_super_admin() or exists(
    select 1 from public.user_brand_access uba
    where uba.user_id=auth.uid() and uba.brand_id=target_brand_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_brand_access enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.smm_campaigns enable row level security;
alter table public.smm_briefs enable row level security;
alter table public.task_assignments enable row level security;

-- Catalog / own-access reads.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using(id=auth.uid() or public.combined_is_super_admin());
drop policy if exists roles_read_catalog on public.roles;
create policy roles_read_catalog on public.roles for select to authenticated using(true);
drop policy if exists permissions_read_catalog on public.permissions;
create policy permissions_read_catalog on public.permissions for select to authenticated using(true);
drop policy if exists role_permissions_read_catalog on public.role_permissions;
create policy role_permissions_read_catalog on public.role_permissions for select to authenticated using(true);
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated using(user_id=auth.uid() or public.combined_is_super_admin());
drop policy if exists user_brand_access_select_own on public.user_brand_access;
create policy user_brand_access_select_own on public.user_brand_access for select to authenticated using(user_id=auth.uid() or public.combined_is_super_admin());
drop policy if exists user_permission_overrides_select_own on public.user_permission_overrides;
create policy user_permission_overrides_select_own on public.user_permission_overrides for select to authenticated using(user_id=auth.uid() or public.combined_is_super_admin());

-- Brand-scoped content persistence.
drop policy if exists smm_campaigns_select_brand on public.smm_campaigns;
create policy smm_campaigns_select_brand on public.smm_campaigns for select to authenticated using(public.combined_has_brand_access(brand_id));
drop policy if exists smm_campaigns_insert_brand on public.smm_campaigns;
create policy smm_campaigns_insert_brand on public.smm_campaigns for insert to authenticated with check(created_by=auth.uid() and public.combined_has_brand_access(brand_id));
drop policy if exists smm_campaigns_update_brand on public.smm_campaigns;
create policy smm_campaigns_update_brand on public.smm_campaigns for update to authenticated using(public.combined_has_brand_access(brand_id)) with check(public.combined_has_brand_access(brand_id));

drop policy if exists smm_briefs_select_brand on public.smm_briefs;
create policy smm_briefs_select_brand on public.smm_briefs for select to authenticated using(public.combined_has_brand_access(brand_id));
drop policy if exists smm_briefs_insert_brand on public.smm_briefs;
create policy smm_briefs_insert_brand on public.smm_briefs for insert to authenticated with check(created_by=auth.uid() and public.combined_has_brand_access(brand_id));
drop policy if exists smm_briefs_update_brand on public.smm_briefs;
create policy smm_briefs_update_brand on public.smm_briefs for update to authenticated using(public.combined_has_brand_access(brand_id)) with check(public.combined_has_brand_access(brand_id));

-- Tasks: assignee can see/update own tasks; managers can be layered via permission-aware RPC later.
drop policy if exists task_assignments_select on public.task_assignments;
create policy task_assignments_select on public.task_assignments for select to authenticated using(
  assigned_to=auth.uid() or assigned_by=auth.uid() or public.combined_is_super_admin()
);
drop policy if exists task_assignments_insert on public.task_assignments;
create policy task_assignments_insert on public.task_assignments for insert to authenticated with check(
  assigned_by=auth.uid() and public.combined_has_brand_access(brand_id)
);
drop policy if exists task_assignments_update on public.task_assignments;
create policy task_assignments_update on public.task_assignments for update to authenticated using(
  assigned_to=auth.uid() or assigned_by=auth.uid() or public.combined_is_super_admin()
) with check(public.combined_has_brand_access(brand_id));

-- Existing manual planning/workspace tables now inherit brand membership when this foundation is applied.
drop policy if exists social_calendar_items_brand_members on public.social_calendar_items;
create policy social_calendar_items_brand_members on public.social_calendar_items for all to authenticated
using(public.combined_has_brand_access(brand_id)) with check(public.combined_has_brand_access(brand_id));

drop policy if exists workspace_links_brand_members on public.workspace_links;
create policy workspace_links_brand_members on public.workspace_links for all to authenticated
using(public.combined_has_brand_access(brand_id)) with check(public.combined_has_brand_access(brand_id));
