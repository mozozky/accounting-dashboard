-- ============================================================
-- 010_add_hard_deadline_day.sql
-- Splits deadline into: hard_deadline_day (period-level)
-- and default_deadline_day (per-stage internal)
-- ============================================================

-- 1. Add hard_deadline_day column
alter table stage_templates
  add column if not exists hard_deadline_day int check (hard_deadline_day between 1 and 31);

-- 2. Migrate existing default_deadline_day → hard_deadline_day (per client+task_type)
update stage_templates st
set hard_deadline_day = sub.first_day
from (
  select client_id, task_type_id,
    (array_agg(default_deadline_day order by order_index)
      filter (where default_deadline_day is not null))[1] as first_day
  from stage_templates
  group by client_id, task_type_id
) sub
where st.client_id is not distinct from sub.client_id
  and st.task_type_id = sub.task_type_id
  and sub.first_day is not null;

-- 3. Clear default_deadline_day — now per-stage internal
update stage_templates set default_deadline_day = null;

-- ============================================================
-- 4. Seed Accounting built-in (client_id = null)
--    hard = 15, per-stage: 3, 10, 11, 12, 13, 15
-- ============================================================
update stage_templates
set hard_deadline_day = 15,
    default_deadline_day = 3
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 0;

update stage_templates
set default_deadline_day = 10
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 1;

update stage_templates
set default_deadline_day = 11
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 2;

update stage_templates
set default_deadline_day = 12
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 3;

update stage_templates
set default_deadline_day = 13
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 4;

update stage_templates
set default_deadline_day = 15
where client_id is null and task_type_id = '11111111-1111-1111-1111-111111111111' and order_index = 5;

-- ============================================================
-- 5. Seed BPJS & Tax built-in
--    hard = 9, per-stage: 5, 8, 8
-- ============================================================
update stage_templates
set hard_deadline_day = 9,
    default_deadline_day = 5
where client_id is null and task_type_id = '33333333-3333-3333-3333-333333333333' and order_index = 0;

update stage_templates
set default_deadline_day = 8
where client_id is null and task_type_id = '33333333-3333-3333-3333-333333333333' and order_index = 1;

update stage_templates
set default_deadline_day = 8
where client_id is null and task_type_id = '33333333-3333-3333-3333-333333333333' and order_index = 2;

-- ============================================================
-- 6. Payroll — biarin aja (null semua)
-- ============================================================
