-- ============================================================
-- 005_add_role_trigger.sql
-- Run this in Supabase SQL Editor
-- Auto-assign role on new profile: first user = leader, rest = staff
-- ============================================================

create or replace function handle_new_user_role()
returns trigger
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count from user_roles;

  if v_count = 0 then
    insert into user_roles (user_id, role) values (new.id, 'leader');
  else
    insert into user_roles (user_id, role) values (new.id, 'staff');
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created on profiles;

create trigger on_profile_created
  after insert on profiles
  for each row execute procedure handle_new_user_role();

-- Backfill: assign role to existing profiles without one
insert into user_roles (user_id, role)
select id, 'leader'
from profiles p
where not exists (select 1 from user_roles ur where ur.user_id = p.id)
order by p.created_at
limit 1
on conflict (user_id) do nothing;

insert into user_roles (user_id, role)
select id, 'staff'
from profiles p
where not exists (select 1 from user_roles ur where ur.user_id = p.id)
on conflict (user_id) do nothing;
