-- Combined Dashboard — brand-scoped RLS for the Combined-specific tables.
--
-- WHY: 20260906_full_smm_parity_v3.sql granted every authenticated user
-- `using (true)` on all Combined tables, so any logged-in user could read and
-- write every brand's briefs, campaigns, tasks and expansions. Brand scoping
-- existed only in application code (canAccessBrand), which is not a boundary.
--
-- SCOPE: only the Combined-specific tables created by the parity migration.
-- The SMM Simplified core tables (brands, campaigns, content_briefs,
-- brief_sections, profiles, roles, permissions, user_roles, user_brand_access)
-- are NOT touched — they remain the source of truth.
--
-- NOT COVERED: public.social_calendar_items and public.workspace_links
-- (20260904_social_workspace.sql) have RLS enabled with no policies, i.e.
-- deny-all. No application code reads or writes them, so they are left as-is.
--
-- PREREQUISITE: the SMM core tables must exist in the same project, because
-- brand access is resolved through public.user_brand_access and public.user_roles.
--
-- STATUS: NOT APPLIED to the shared Supabase project. Verified locally against
-- Postgres 16 with a stub of the SMM core tables: brand-scoped reads, blocked
-- cross-brand writes, super_admin bypass, and no leftover permissive policies.
-- Applying it changes who can read what, so run it deliberately and re-verify
-- with two real users from different brands before trusting it.
--
-- ROLLBACK: re-run the policy block at the bottom of
-- 20260906_full_smm_parity_v3.sql (the `using (true)` policies) to restore the
-- previous permissive behaviour.

-- Brand access helper. SECURITY DEFINER so the policy can read user_brand_access
-- and user_roles regardless of those tables' own RLS.
create or replace function public.smm_combined_can_access_brand(p_brand_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when p_brand_id is null or btrim(p_brand_id) = '' then false
    when exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.key = 'super_admin'
    ) then true
    else exists (
      select 1
      from public.user_brand_access uba
      where uba.user_id = auth.uid()
        and uba.brand_id::text = p_brand_id
    )
  end;
$$;

revoke all on function public.smm_combined_can_access_brand(text) from public;
grant execute on function public.smm_combined_can_access_brand(text) to authenticated;

-- Drop every existing policy on the Combined-specific tables first. The parity
-- migration named them inconsistently ("combined briefs", "combined tasks", ...),
-- so matching by name would leave the permissive `using (true)` policies in
-- place — Postgres ORs policies, so one leftover permissive policy wins.
do $$
declare
  target text;
  existing record;
begin
  foreach target in array array[
    'smm_campaigns', 'smm_briefs', 'content_expansions', 'content_expansion_meta',
    'expansion_calendar', 'workspace_tasks', 'workspace_users', 'workspace_settings'
  ] loop
    for existing in
      select polname from pg_policy
      where polrelid = format('public.%I', target)::regclass
    loop
      execute format('drop policy %I on public.%I', existing.polname, target);
    end loop;
  end loop;
end $$;

-- Brand-scoped tables: read and write both require access to that brand.
do $$
declare
  target text;
begin
  foreach target in array array[
    'smm_campaigns', 'smm_briefs', 'content_expansions',
    'expansion_calendar', 'workspace_tasks'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.smm_combined_can_access_brand(brand_id))',
      'combined ' || target || ' read', target);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.smm_combined_can_access_brand(brand_id)) with check (public.smm_combined_can_access_brand(brand_id))',
      'combined ' || target || ' write', target);
  end loop;
end $$;

-- content_expansion_meta has no brand_id column; its brand is inherited from the
-- owning brief, so scope it through smm_briefs instead.
create policy "combined content_expansion_meta read" on public.content_expansion_meta
  for select to authenticated
  using (exists (
    select 1 from public.smm_briefs b
    where b.id = content_expansion_meta.brief_id
      and public.smm_combined_can_access_brand(b.brand_id)
  ));
create policy "combined content_expansion_meta write" on public.content_expansion_meta
  for all to authenticated
  using (exists (
    select 1 from public.smm_briefs b
    where b.id = content_expansion_meta.brief_id
      and public.smm_combined_can_access_brand(b.brand_id)
  ))
  with check (exists (
    select 1 from public.smm_briefs b
    where b.id = content_expansion_meta.brief_id
      and public.smm_combined_can_access_brand(b.brand_id)
  ));

-- workspace_users has no brand_id column: the team roster is workspace-wide, so
-- reads stay open to authenticated users but writes are limited to super_admin.
create policy "combined workspace users read" on public.workspace_users
  for select to authenticated using (true);
create policy "combined workspace users write" on public.workspace_users
  for all to authenticated
  using (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = 'super_admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = 'super_admin'
  ));

-- workspace_settings is a single workspace-wide row (id = 'default').
create policy "combined settings read" on public.workspace_settings
  for select to authenticated using (true);
create policy "combined settings write" on public.workspace_settings
  for all to authenticated
  using (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = 'super_admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = 'super_admin'
  ));

-- Verification queries (run manually after applying):
--   select public.smm_combined_can_access_brand('<brand-uuid>');   -- as each user
--   select tablename, policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename like 'smm_%' or tablename like 'workspace_%';
