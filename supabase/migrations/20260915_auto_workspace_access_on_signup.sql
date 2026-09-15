-- Auto-provision safe default workspace access for newly registered users.
-- New accounts receive the read-only Viewer role and access to all existing brands.
-- Admins can upgrade role / narrow brand access later from Users & Access.

create or replace function public.smm_auto_workspace_access_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  select id into v_role_id
  from public.roles
  where key = 'viewer'
  limit 1;

  if v_role_id is null then
    raise exception 'Viewer role is not configured';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (new.id, v_role_id)
  on conflict do nothing;

  insert into public.user_brand_access (user_id, brand_id)
  select new.id, b.id
  from public.brands b
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists smm_auto_workspace_access_after_signup on auth.users;
create trigger smm_auto_workspace_access_after_signup
after insert on auth.users
for each row execute function public.smm_auto_workspace_access_on_signup();

-- Backfill existing registered users that still have no workspace role.
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
cross join lateral (
  select id from public.roles where key = 'viewer' limit 1
) r
where not exists (
  select 1 from public.user_roles ur where ur.user_id = u.id
)
on conflict do nothing;

insert into public.user_brand_access (user_id, brand_id)
select u.id, b.id
from auth.users u
cross join public.brands b
where exists (
  select 1
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = u.id and r.key = 'viewer'
)
on conflict do nothing;
