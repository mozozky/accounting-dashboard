-- ============================================================
-- 003_seed_data.sql
-- Run this in Supabase SQL Editor after 001 + 002
-- Creates dummy clients, periods, and stages for dashboard testing
-- Safe to re-run (uses ON CONFLICT DO NOTHING / checks)
-- ============================================================

do $$
declare
  v_pic_id uuid;
  v_second_pic_id uuid;
  v_abc_id uuid;
  v_xyz_id uuid;
  v_cv_id uuid;
  v_period_id uuid;
  v_stage_id uuid;
  v_count int;

  -- built-in task types (seeded in 002)
  v_acct_id uuid := '11111111-1111-1111-1111-111111111111';
  v_payroll_id uuid := '22222222-2222-2222-2222-222222222222';
  v_bpjs_id uuid := '33333333-3333-3333-3333-333333333333';

  v_month int := 5;
  v_year int := 2026;
begin
  -- ============================================================
  -- Get existing profile(s) as PIC
  -- ============================================================
  select id into v_pic_id from profiles order by created_at limit 1;
  select id into v_second_pic_id from profiles order by created_at limit 1;

  if v_pic_id is null then
    raise notice 'No profiles found.';
    raise notice 'Go to Supabase → Authentication → Add User to create a user first.';
    return;
  end if;

  raise notice 'Using PIC: %', v_pic_id;

  -- ============================================================
  -- Insert clients
  -- ============================================================
  insert into clients (name, pic_user_id, contact_name, contact_email)
  values ('PT ABC Makmur', v_pic_id, 'Budi Santoso', 'budi@abcmakmur.com')
  on conflict (id) do nothing;

  insert into clients (name, pic_user_id, contact_name, contact_email)
  values ('PT XYZ Indonesia', v_pic_id, 'Dewi Lestari', 'dewi@xyz.co.id')
  on conflict (id) do nothing;

  insert into clients (name, pic_user_id, contact_name, contact_email)
  values ('CV Maju Jaya', v_pic_id, 'Agus Wijaya', 'agus@majujaya.com')
  on conflict (id) do nothing;

  select id into v_abc_id from clients where name = 'PT ABC Makmur';
  select id into v_xyz_id from clients where name = 'PT XYZ Indonesia';
  select id into v_cv_id from clients where name = 'CV Maju Jaya';

  raise notice 'Clients: ABC=%, XYZ=%, CV=%', v_abc_id, v_xyz_id, v_cv_id;

  -- ============================================================
  -- Copy default stage_templates → per-client
  -- PT ABC: Accounting + Payroll
  -- PT XYZ: Accounting + Payroll
  -- CV Maju Jaya: BPJS & Tax + Accounting
  -- ============================================================

  -- PT ABC + Accounting
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_abc_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_acct_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  -- PT ABC + Payroll
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_abc_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_payroll_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  -- PT XYZ + Accounting
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_xyz_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_acct_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  -- PT XYZ + Payroll
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_xyz_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_payroll_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  -- CV Maju Jaya + BPJS & Tax
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_cv_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_bpjs_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  -- CV Maju Jaya + Accounting
  insert into stage_templates (client_id, task_type_id, stage_name, order_index, is_billable, is_active)
  select
    v_cv_id, task_type_id, stage_name, order_index, is_billable, is_active
  from stage_templates
  where client_id is null and task_type_id = v_acct_id and is_active = true
  on conflict (client_id, task_type_id, order_index) do nothing;

  raise notice 'Stage templates copied for all 3 clients';

  -- ============================================================
  -- Create periods for May 2026
  -- ============================================================

  -- --- PT ABC + Accounting: In Progress (2 done, 1 in_progress, 3 not_started) ---
  insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
  values (v_abc_id, v_acct_id, v_month, v_year, '2026-06-15')
  on conflict (client_id, task_type_id, period_month, period_year) do update
  set hard_deadline = '2026-06-15'
  returning id into v_period_id;

  raise notice 'Period ABC+Acct: %', v_period_id;

  -- Get or create stages for this period
  delete from period_stages where period_id = v_period_id;

  insert into period_stages (period_id, stage_name, order_index, status, internal_deadline)
  select v_period_id, stage_name, order_index,
    case order_index
      when 0 then 'done'
      when 1 then 'done'
      when 2 then 'in_progress'
      else 'not_started'
    end,
    case order_index when 2 then '2026-05-28'::date else null::date end
  from stage_templates
  where client_id = v_abc_id and task_type_id = v_acct_id and is_active = true;

  --- PT ABC + Payroll: Not Started (0 done) with deadline this week ---
  insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
  values (v_abc_id, v_payroll_id, v_month, v_year, '2026-06-02')
  on conflict (client_id, task_type_id, period_month, period_year) do update
  set hard_deadline = '2026-06-02'
  returning id into v_period_id;

  delete from period_stages where period_id = v_period_id;

  insert into period_stages (period_id, stage_name, order_index, status)
  select v_period_id, stage_name, order_index, 'not_started'
  from stage_templates
  where client_id = v_abc_id and task_type_id = v_payroll_id and is_active = true;

  --- PT XYZ + Accounting: Done (all 6 done) ---
  insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
  values (v_xyz_id, v_acct_id, v_month, v_year, '2026-05-20')
  on conflict (client_id, task_type_id, period_month, period_year) do update
  set hard_deadline = '2026-05-20'
  returning id into v_period_id;

  delete from period_stages where period_id = v_period_id;

  insert into period_stages (period_id, stage_name, order_index, status)
  select v_period_id, stage_name, order_index, 'done'
  from stage_templates
  where client_id = v_xyz_id and task_type_id = v_acct_id and is_active = true;

  --- PT XYZ + Payroll: Overdue (deadline 1 minggu lalu, semua not_started) ---
  insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
  values (v_xyz_id, v_payroll_id, v_month, v_year, '2026-05-21')
  on conflict (client_id, task_type_id, period_month, period_year) do update
  set hard_deadline = '2026-05-21'
  returning id into v_period_id;

  delete from period_stages where period_id = v_period_id;

  insert into period_stages (period_id, stage_name, order_index, status)
  select v_period_id, stage_name, order_index, 'not_started'
  from stage_templates
  where client_id = v_xyz_id and task_type_id = v_payroll_id and is_active = true;

  --- CV Maju Jaya + BPJS & Tax: Blocked (1 blocked, 1 done, 1 not_started) ---
  insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
  values (v_cv_id, v_bpjs_id, v_month, v_year, '2026-06-10')
  on conflict (client_id, task_type_id, period_month, period_year) do update
  set hard_deadline = '2026-06-10'
  returning id into v_period_id;

  delete from period_stages where period_id = v_period_id;

  insert into period_stages (period_id, stage_name, order_index, status)
  select v_period_id, stage_name, order_index,
    case order_index
      when 0 then 'done'
      when 1 then 'blocked'
      when 2 then 'not_started'
      else 'not_started'
    end
  from stage_templates
  where client_id = v_cv_id and task_type_id = v_bpjs_id and is_active = true;

  -- Add notes to blocked stage
  update period_stages
  set notes = 'Client not responding to emails. Need to call directly.'
  where period_id = v_period_id and stage_name = 'Send to Client';

  --- CV Maju Jaya + Accounting: No period (skip — NO period created) ---
  -- Intentional: no period = "No Period" badge + "Generate" button

  -- ============================================================
  -- Add sample stage_tasks to PT ABC Accounting (first done stage)
  -- ============================================================
  select id into v_stage_id
  from period_stages
  where period_id = (
    select id from client_periods
    where client_id = v_abc_id and task_type_id = v_acct_id
    and period_month = v_month and period_year = v_year
  )
  and order_index = 0;

  if v_stage_id is not null then
    delete from stage_tasks where stage_id = v_stage_id;

    insert into stage_tasks (stage_id, label, is_done, order_index) values
      (v_stage_id, 'Collect bank statements', true, 0),
      (v_stage_id, 'Collect invoices', true, 1),
      (v_stage_id, 'Verify GL balances', true, 2);
  end if;

  raise notice 'Seed data complete!';
  raise notice 'Refresh dashboard at http://localhost:3000/dashboard';
end;
$$;
