-- ============================================================
-- 001_initial_schema.sql
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. profiles (sync dari auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "authenticated full access" on profiles
  for all using (auth.role() = 'authenticated');

-- trigger: auto-create profile saat user baru signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 2. user_roles
-- ============================================================
create table if not exists user_roles (
  user_id uuid references profiles(id) on delete cascade primary key,
  role text check (role in ('leader', 'staff')) not null default 'staff'
);

alter table user_roles enable row level security;

create policy "authenticated can read roles" on user_roles
  for select using (auth.role() = 'authenticated');

-- helper function: cek role user
create or replace function has_role(check_role text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = check_role
  );
end;
$$;

-- ============================================================
-- 3. clients
-- ============================================================
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  pic_user_id uuid references profiles(id),
  contact_name text,
  contact_email text,
  contact_phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table clients enable row level security;

create policy "authenticated full access" on clients
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 4. stage_templates
-- ============================================================
create table if not exists stage_templates (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  stage_name text not null,
  order_index int not null,
  is_billable boolean default false,
  is_active boolean default true
);

alter table stage_templates enable row level security;

create policy "authenticated full access" on stage_templates
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 5. client_periods
-- ============================================================
create table if not exists client_periods (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  period_month int check (period_month between 1 and 12),
  period_year int,
  hard_deadline date,
  created_at timestamptz default now(),
  unique(client_id, period_month, period_year)
);

alter table client_periods enable row level security;

create policy "authenticated full access" on client_periods
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 6. period_stages
-- ============================================================
create table if not exists period_stages (
  id uuid default gen_random_uuid() primary key,
  period_id uuid references client_periods(id) on delete cascade,
  stage_name text not null,
  order_index int not null,
  status text check (status in ('not_started','in_progress','done','blocked'))
    default 'not_started',
  internal_deadline date,
  assignee_user_id uuid references profiles(id),
  notes text,
  updated_at timestamptz default now()
);

alter table period_stages enable row level security;

create policy "authenticated full access" on period_stages
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 7. stage_tasks
-- ============================================================
create table if not exists stage_tasks (
  id uuid default gen_random_uuid() primary key,
  stage_id uuid references period_stages(id) on delete cascade,
  label text not null,
  is_done boolean default false,
  order_index int default 0
);

alter table stage_tasks enable row level security;

create policy "authenticated full access" on stage_tasks
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- DONE
-- ============================================================
