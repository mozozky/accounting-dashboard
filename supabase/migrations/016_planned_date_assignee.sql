-- ============================================================
-- 016_planned_date_assignee.sql
-- Run this in Supabase SQL Editor AFTER 015.
--
-- Adds two features:
--
-- Fitur 1 — Planned Date (review target for manager):
--   stage_templates.planned_date_day  int   nullable
--     Day-of-month for the NEXT month (same pattern as
--     default_deadline_day). Null = no planned date default.
--   period_stages.planned_date        date  nullable
--     Snapshot of the planned date for this specific period.
--     Auto-filled from template at period generation.
--     Can be overridden per-period from the period detail page.
--
-- Fitur 2 — Auto-assign PIC (default assignee from client PIC):
--   stage_templates.default_assignee_type  text  default 'pic'
--     'pic'  → assignee_user_id = client.pic_user_id at generation
--     'none' → assignee_user_id = null (manual assignment)
--   Default 'pic' means ALL existing stage templates automatically
--   use the client PIC — no data migration needed.
--
-- Both additions are backward-compatible (nullable / have defaults).
-- ============================================================

-- Fitur 1: planned date columns
alter table stage_templates
  add column if not exists planned_date_day int;

alter table period_stages
  add column if not exists planned_date date;

-- Fitur 2: default assignee type
alter table stage_templates
  add column if not exists default_assignee_type text
  not null default 'pic'
  check (default_assignee_type in ('pic', 'none'));

-- ============================================================
-- DONE
-- ============================================================
