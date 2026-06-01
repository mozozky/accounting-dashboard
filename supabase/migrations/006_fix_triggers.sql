-- ============================================================
-- 006_fix_triggers.sql (v2 — single trigger, no cascade)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Drop the cascade trigger (no longer needed)
-- ============================================================
drop trigger if exists on_profile_created on profiles;
drop function if exists handle_new_user_role();

-- ============================================================
-- 2. Single combined trigger: profile + role in one go
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  -- Profile
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;

  -- Role: first ever = leader, otherwise = staff
  select count(*) into v_count from user_roles;

  if v_count = 0 then
    insert into user_roles (user_id, role) values (new.id, 'leader')
    on conflict (user_id) do nothing;
  else
    insert into user_roles (user_id, role) values (new.id, 'staff')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 3. Re-attach trigger to auth.users
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 4. Backfill existing profiles without roles
-- ============================================================
insert into user_roles (user_id, role)
select p.id, 'leader'
from profiles p
where not exists (select 1 from user_roles ur where ur.user_id = p.id)
  and not exists (select 1 from user_roles)  -- first row = leader
limit 1
on conflict (user_id) do nothing;

insert into user_roles (user_id, role)
select p.id, 'staff'
from profiles p
where not exists (select 1 from user_roles ur where ur.user_id = p.id)
on conflict (user_id) do nothing;

-- ============================================================
-- DONE — Test: invite via /team
-- ============================================================
