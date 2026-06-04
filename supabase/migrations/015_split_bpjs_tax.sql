-- ============================================================
-- 015_split_bpjs_tax.sql
-- Run this in Supabase SQL Editor AFTER 014.
--
-- Splits the single built-in task type "BPJS & Tax" into two
-- separate built-in task types: "BPJS" and "Tax", each with its
-- own stages and hard deadline.
--
--   BPJS  — hard deadline day 10
--     0 Data Request        (internal day 3)
--     1 Bill Processing     (internal day 5)
--     2 Review              (internal day 7)
--     3 Send to Client      (internal day 8)
--
--   Tax   — hard deadline day 15
--     0 Data Request          (internal day 4)
--     1 Import Bukti Potong   (internal day 6)
--     2 Konsep SPT + Review   (internal day 9)
--     3 Proses Kode Billing   (internal day 11)
--     4 Send to Client        (internal day 12)
--     5 Lapor SPT             (internal day 15)
--
-- Auto-migration: every client currently assigned the old
-- "BPJS & Tax" is assigned BPJS + Tax, and May 2026 periods are
-- generated for both (hard deadlines 2026-06-10 and 2026-06-15).
--
-- The old "BPJS & Tax" is NOT deleted — it is deactivated and
-- un-built-in so it disappears from the dashboard and the
-- "assign task type" list, while historical rows stay intact.
--
-- This script is idempotent (safe to re-run).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create the two new built-in task types (fixed UUIDs).
-- ------------------------------------------------------------
insert into task_types (id, name, is_builtin)
select '44444444-4444-4444-4444-444444444444', 'BPJS', true
where not exists (
  select 1 from task_types where name = 'BPJS' and client_id is null
);

insert into task_types (id, name, is_builtin)
select '55555555-5555-5555-5555-555555555555', 'Tax', true
where not exists (
  select 1 from task_types where name = 'Tax' and client_id is null
);

-- ------------------------------------------------------------
-- 2. Seed global default stage templates (client_id = null).
--    Delete-then-insert so re-running stays clean (NULL client_id
--    rows are not caught by ON CONFLICT).
-- ------------------------------------------------------------
delete from stage_templates
where client_id is null
  and task_type_id in (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  );

-- BPJS — hard deadline day 10
insert into stage_templates
  (client_id, task_type_id, stage_name, order_index, is_billable, is_active, hard_deadline_day, default_deadline_day)
values
  (null, '44444444-4444-4444-4444-444444444444', 'Data Request',    0, false, true, 10, 3),
  (null, '44444444-4444-4444-4444-444444444444', 'Bill Processing', 1, false, true, 10, 5),
  (null, '44444444-4444-4444-4444-444444444444', 'Review',          2, false, true, 10, 7),
  (null, '44444444-4444-4444-4444-444444444444', 'Send to Client',  3, false, true, 10, 8);

-- Tax — hard deadline day 15
insert into stage_templates
  (client_id, task_type_id, stage_name, order_index, is_billable, is_active, hard_deadline_day, default_deadline_day)
values
  (null, '55555555-5555-5555-5555-555555555555', 'Data Request',        0, false, true, 15, 4),
  (null, '55555555-5555-5555-5555-555555555555', 'Import Bukti Potong', 1, false, true, 15, 6),
  (null, '55555555-5555-5555-5555-555555555555', 'Konsep SPT + Review', 2, false, true, 15, 9),
  (null, '55555555-5555-5555-5555-555555555555', 'Proses Kode Billing', 3, false, true, 15, 11),
  (null, '55555555-5555-5555-5555-555555555555', 'Send to Client',      4, false, true, 15, 12),
  (null, '55555555-5555-5555-5555-555555555555', 'Lapor SPT',           5, false, true, 15, 15);

-- ------------------------------------------------------------
-- 3. Assign BPJS + Tax to every client that currently has the
--    old "BPJS & Tax" assigned (copy global templates per client).
-- ------------------------------------------------------------
insert into stage_templates
  (client_id, task_type_id, stage_name, order_index, is_billable, is_active, hard_deadline_day, default_deadline_day)
select
  c.client_id, g.task_type_id, g.stage_name, g.order_index,
  g.is_billable, true, g.hard_deadline_day, g.default_deadline_day
from (
  select distinct client_id
  from stage_templates
  where task_type_id = '33333333-3333-3333-3333-333333333333'
    and client_id is not null
) c
cross join stage_templates g
where g.client_id is null
  and g.task_type_id in (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  )
on conflict (client_id, task_type_id, order_index) do nothing;

-- ------------------------------------------------------------
-- 4. Generate May 2026 periods for BPJS + Tax for those clients.
--    Period month = 5 (May closing); hard deadlines fall in June.
-- ------------------------------------------------------------
insert into client_periods (client_id, task_type_id, period_month, period_year, hard_deadline)
select
  c.client_id,
  tt.id,
  5, 2026,
  case tt.id
    when '44444444-4444-4444-4444-444444444444' then date '2026-06-10'
    when '55555555-5555-5555-5555-555555555555' then date '2026-06-15'
  end
from (
  select distinct client_id
  from stage_templates
  where task_type_id = '33333333-3333-3333-3333-333333333333'
    and client_id is not null
) c
cross join (
  values
    ('44444444-4444-4444-4444-444444444444'::uuid),
    ('55555555-5555-5555-5555-555555555555'::uuid)
) as tt(id)
on conflict (client_id, task_type_id, period_month, period_year) do nothing;

-- ------------------------------------------------------------
-- 5. Snapshot period_stages from each client's new templates.
--    NOT EXISTS guard keeps this idempotent.
--    Internal deadline = June (month after May) at the stage's day.
-- ------------------------------------------------------------
insert into period_stages (period_id, stage_name, order_index, status, internal_deadline)
select
  cp.id, st.stage_name, st.order_index, 'not_started',
  case
    when st.default_deadline_day is null then null
    else make_date(2026, 6, least(st.default_deadline_day, 30))
  end
from client_periods cp
join stage_templates st
  on st.client_id = cp.client_id
  and st.task_type_id = cp.task_type_id
  and st.is_active = true
where cp.period_month = 5
  and cp.period_year = 2026
  and cp.task_type_id in (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  )
  and not exists (
    select 1 from period_stages ps where ps.period_id = cp.id
  );

-- ------------------------------------------------------------
-- 6. Retire the old "BPJS & Tax":
--    - deactivate all its stage templates (hidden from dashboard
--      + settings, which filter is_active = true)
--    - un-built-in it (hidden from the "assign task type" list,
--      which filters is_builtin = true)
--    - rename for clarity in any historical period view
--    Historical periods/stages are preserved, just not shown.
-- ------------------------------------------------------------
update stage_templates
set is_active = false
where task_type_id = '33333333-3333-3333-3333-333333333333';

update task_types
set is_builtin = false,
    name = 'BPJS & Tax (legacy)'
where id = '33333333-3333-3333-3333-333333333333';

-- ============================================================
-- DONE
-- ============================================================
