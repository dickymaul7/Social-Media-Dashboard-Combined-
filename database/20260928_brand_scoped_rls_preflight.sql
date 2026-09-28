-- Combined Dashboard — pre-flight check for 20260928_brand_scoped_rls.sql
--
-- READ ONLY. Safe to run in the Supabase SQL editor at any time. It reports the
-- current state and what the migration would change, without touching anything.
-- Run this BEFORE applying, and again AFTER to confirm.

-- 1) Do the tables the migration needs exist?
select t.tablename,
       t.rowsecurity as rls_enabled,
       (select count(*) from pg_policy p
         join pg_class c on c.oid = p.polrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = t.tablename) as policy_count
from pg_tables t
where t.schemaname = 'public'
  and t.tablename in ('smm_campaigns','smm_briefs','content_expansions',
                      'content_expansion_meta','expansion_calendar','workspace_tasks',
                      'workspace_users','workspace_settings')
order by t.tablename;

-- 2) Prerequisites for the access helper: these SMM core tables must be present,
--    otherwise smm_combined_can_access_brand() will fail at query time.
select 'user_brand_access' as required_table,
       to_regclass('public.user_brand_access') is not null as present
union all
select 'user_roles', to_regclass('public.user_roles') is not null
union all
select 'roles', to_regclass('public.roles') is not null;

-- 3) Does the roles table actually use column `key` with a 'super_admin' row?
--    The helper depends on both. Adjust the migration if this disagrees.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'roles'
order by ordinal_position;

select count(*) as super_admin_role_rows
from public.roles where key = 'super_admin';

-- 4) THE BUG: permissive policies that let any authenticated user touch any
--    brand. These are what the migration removes. Anything listed here is
--    currently readable and writable by every logged-in user.
select c.relname as tablename, p.polname as policy_name,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('smm_campaigns','smm_briefs','content_expansions',
                    'content_expansion_meta','expansion_calendar','workspace_tasks',
                    'workspace_users','workspace_settings')
  and (pg_get_expr(p.polqual, p.polrelid) = 'true'
       or pg_get_expr(p.polwithcheck, p.polrelid) = 'true')
order by c.relname, p.polname;

-- 5) Policy names that the migration must drop. Postgres ORs policies, so a
--    leftover permissive one silently wins even after the new ones exist.
select c.relname as tablename, p.polname as existing_policy
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('smm_campaigns','smm_briefs','content_expansions',
                    'content_expansion_meta','expansion_calendar','workspace_tasks',
                    'workspace_users','workspace_settings')
order by c.relname, p.polname;

-- 6) Will any existing row become invisible? Rows whose brand_id is not covered
--    by user_brand_access and not owned by a super_admin lose their readers
--    after the migration. Review this BEFORE applying.
select b.id as brief_id, b.brand_id,
       (select count(*) from public.user_brand_access uba
         where uba.brand_id::text = b.brand_id) as users_with_access
from public.smm_briefs b
order by users_with_access, b.brand_id
limit 50;

-- 7) Brand ids present in Combined tables vs. ids known to the core brands
--    table. A mismatch (legacy slug ids, empty, null) means that row becomes
--    unreachable for everyone except super_admin.
--    Dynamic SQL: `public.brands` must not be referenced at parse time, because
--    the whole script would fail to compile if that table is absent.
do $$
declare
  has_brands boolean := to_regclass('public.brands') is not null;
  r record;
begin
  if not has_brands then
    raise notice 'public.brands not found - skipping the brand-id cross-check (7).';
    return;
  end if;
  raise notice 'brand ids in Combined tables (known_in_brands = exists in public.brands):';
  for r in execute $q$
    select 'smm_briefs' as source,
           coalesce(nullif(btrim(brand_id),''),'<empty>') as brand_id,
           bool_or(exists (select 1 from public.brands br where br.id::text = smm_briefs.brand_id)) as known_in_brands
    from public.smm_briefs group by 2
    union all
    select 'workspace_tasks',
           coalesce(nullif(btrim(brand_id),''),'<empty>'),
           bool_or(exists (select 1 from public.brands br where br.id::text = workspace_tasks.brand_id))
    from public.workspace_tasks group by 2
    order by 1, 2
  $q$ loop
    raise notice '  % | % | known_in_brands=%', r.source, r.brand_id, r.known_in_brands;
  end loop;
end $$;
