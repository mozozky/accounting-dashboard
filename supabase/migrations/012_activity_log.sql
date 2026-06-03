-- ============================================================
-- 012_activity_log.sql
-- Audit trail for all user actions
-- ============================================================

create table if not exists activity_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text,
  action text not null,
  entity_type text not null,
  entity_name text,
  details text,
  created_at timestamptz default now()
);

alter table activity_log enable row level security;

create policy "authenticated full access" on activity_log
  for all using (auth.role() = 'authenticated');

create index idx_activity_log_created_at on activity_log(created_at desc);
