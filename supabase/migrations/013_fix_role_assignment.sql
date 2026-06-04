-- ============================================================
-- 013_fix_role_assignment.sql
-- Run this in Supabase SQL Editor.
--
-- Fixes two issues:
--   1. user_roles had no INSERT/UPDATE/DELETE policy, so role
--      assignment from the app (anon key) was silently blocked.
--   2. Role assignment used a count()+insert pattern in app code,
--      which has a race condition (two concurrent first signups
--      could both become 'leader').
--
-- Solution: a SECURITY DEFINER function that assigns the role
-- atomically (serialized via advisory lock). First user ever
-- becomes 'leader', everyone else 'staff'.
-- ============================================================

create or replace function assign_user_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_role text;
  role_count int;
  new_role text;
begin
  -- Must be called by an authenticated user
  if uid is null then
    return null;
  end if;

  -- Serialize concurrent signups so the "first user" check is atomic
  perform pg_advisory_xact_lock(hashtext('assign_user_role'));

  -- Already has a role? Return it (idempotent).
  select role into existing_role from user_roles where user_id = uid;
  if existing_role is not null then
    return existing_role;
  end if;

  -- First user in the system becomes the leader, everyone else staff.
  select count(*) into role_count from user_roles;
  new_role := case when role_count = 0 then 'leader' else 'staff' end;

  insert into user_roles (user_id, role) values (uid, new_role);
  return new_role;
end;
$$;

grant execute on function assign_user_role() to authenticated;

-- ------------------------------------------------------------
-- Write policy for user_roles (defense in depth).
-- The existing "authenticated can read roles" SELECT policy stays.
-- Inserts during signup go through assign_user_role() (SECURITY
-- DEFINER, bypasses RLS), but leaders may also manage roles directly
-- (e.g. removing a member). Staff cannot modify any roles.
-- ------------------------------------------------------------
drop policy if exists "leaders manage roles" on user_roles;

create policy "leaders manage roles" on user_roles
  for all
  using (has_role('leader'))
  with check (has_role('leader'));

-- ============================================================
-- DONE
-- ============================================================
