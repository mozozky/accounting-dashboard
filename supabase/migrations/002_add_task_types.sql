-- ============================================================
-- 002_add_task_types.sql
-- Run this in Supabase SQL Editor AFTER 001
-- ============================================================

-- ============================================================
-- 1. task_types — katalog task type
-- ============================================================
create table if not exists task_types (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  client_id uuid references clients(id) on delete cascade,
  is_builtin boolean default false,
  created_at timestamptz default now(),
  unique(name, client_id)
);

alter table task_types enable row level security;

create policy "authenticated full access" on task_types
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 2. Seed 3 built-in task types
-- ============================================================
insert into task_types (id, name, is_builtin)
values
  ('11111111-1111-1111-1111-111111111111', 'Accounting', true),
  ('22222222-2222-2222-2222-222222222222', 'Payroll', true),
  ('33333333-3333-3333-3333-333333333333', 'BPJS & Tax', true)
on conflict (name, client_id) where client_id is null do nothing;

-- ============================================================
-- 3. Drop old stage_templates, recreate with task_type_id
-- ============================================================
drop table if exists stage_templates cascade;

create table stage_templates (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  task_type_id uuid references task_types(id) on delete cascade,
  stage_name text not null,
  order_index int not null,
  is_billable boolean default false,
  is_active boolean default true,
  unique(client_id, task_type_id, order_index)
);

alter table stage_templates enable row level security;

create policy "authenticated full access" on stage_templates
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 4. Seed default stages untuk 3 built-in task types
--    (client_id = null artinya template default global)
-- ============================================================

-- Accounting (6 stages)
insert into stage_templates (client_id, task_type_id, stage_name, order_index)
values
  (null, '11111111-1111-1111-1111-111111111111', 'Data Request', 0),
  (null, '11111111-1111-1111-1111-111111111111', 'GL WHT Process & Report', 1),
  (null, '11111111-1111-1111-1111-111111111111', '1st Review', 2),
  (null, '11111111-1111-1111-1111-111111111111', '2nd Review', 3),
  (null, '11111111-1111-1111-1111-111111111111', 'Manager Review', 4),
  (null, '11111111-1111-1111-1111-111111111111', 'Send to Client', 5)
on conflict (client_id, task_type_id, order_index) do nothing;

-- Payroll (6 stages)
insert into stage_templates (client_id, task_type_id, stage_name, order_index)
values
  (null, '22222222-2222-2222-2222-222222222222', 'Data Request', 0),
  (null, '22222222-2222-2222-2222-222222222222', 'Payroll Processing', 1),
  (null, '22222222-2222-2222-2222-222222222222', '1st Review', 2),
  (null, '22222222-2222-2222-2222-222222222222', '2nd Review', 3),
  (null, '22222222-2222-2222-2222-222222222222', 'Manager Review', 4),
  (null, '22222222-2222-2222-2222-222222222222', 'Send to Client', 5)
on conflict (client_id, task_type_id, order_index) do nothing;

-- BPJS & Tax (3 stages)
insert into stage_templates (client_id, task_type_id, stage_name, order_index)
values
  (null, '33333333-3333-3333-3333-333333333333', 'Data Collection', 0),
  (null, '33333333-3333-3333-3333-333333333333', 'Send to Client', 1),
  (null, '33333333-3333-3333-3333-333333333333', 'Report Status', 2)
on conflict (client_id, task_type_id, order_index) do nothing;

-- ============================================================
-- 5. Alter client_periods — tambah task_type_id
-- ============================================================

-- Drop existing unique constraint
alter table client_periods
  drop constraint if exists client_periods_client_id_period_month_period_year_key;

-- Add task_type_id column
alter table client_periods
  add column if not exists task_type_id uuid references task_types(id) on delete cascade;

-- Add new unique constraint
alter table client_periods
  add constraint client_periods_unique
  unique(client_id, task_type_id, period_month, period_year);

-- ============================================================
-- DONE
-- ============================================================
