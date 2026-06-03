-- ============================================================
-- 009_add_default_deadline.sql
-- Adds default_deadline_day to stage_templates for deadline carry-forward
-- ============================================================

alter table stage_templates
  add column if not exists default_deadline_day int check (default_deadline_day between 1 and 31);
