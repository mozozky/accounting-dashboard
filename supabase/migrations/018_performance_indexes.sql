-- Migration 018: performance indexes
--
-- Postgres does NOT auto-create indexes on foreign-key columns, and the
-- dashboard / my-tasks / settings queries filter and join heavily on these.
-- Adding them turns sequential scans into index lookups. Safe + idempotent
-- (IF NOT EXISTS), and instant to create at the current data size.

-- period_stages: embedded under client_periods (by period_id) on every
-- dashboard + period query, and filtered by assignee on My Tasks.
create index if not exists idx_period_stages_period_id
  on period_stages (period_id);
create index if not exists idx_period_stages_assignee_user_id
  on period_stages (assignee_user_id);

-- client_periods: dashboard filters the selected month and the prior-months
-- range by (period_year, period_month); joins key on client_id / task_type_id.
create index if not exists idx_client_periods_year_month
  on client_periods (period_year, period_month);
create index if not exists idx_client_periods_client_id
  on client_periods (client_id);
create index if not exists idx_client_periods_task_type_id
  on client_periods (task_type_id);

-- stage_tasks: fetched per stage (by stage_id) for checklists.
create index if not exists idx_stage_tasks_stage_id
  on stage_tasks (stage_id);

-- stage_templates: dashboard derives client x task pairs; settings filters here.
create index if not exists idx_stage_templates_client_id
  on stage_templates (client_id);
create index if not exists idx_stage_templates_task_type_id
  on stage_templates (task_type_id);

-- clients: PIC lookups + joins.
create index if not exists idx_clients_pic_user_id
  on clients (pic_user_id);
