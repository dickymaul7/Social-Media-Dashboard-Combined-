-- Keep Combined task-assignment role parity with SMM Simplified.
-- Safe for an existing shared Supabase project: this only widens the team_members role constraint.

alter table public.team_members drop constraint if exists team_members_role_check;

alter table public.team_members
add constraint team_members_role_check
check (role in (
  'superadmin',
  'content_writer',
  'content_creator',
  'designer',
  'video_editor',
  'member'
));
