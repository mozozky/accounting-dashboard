-- ============================================================
-- 004_add_stage_completion.sql
-- Run this in Supabase SQL Editor
-- Adds completion tracking to period_stages
-- ============================================================

-- Add completed_at timestamp (set when stage is marked 'done')
alter table period_stages
  add column if not exists completed_at timestamptz;

-- Add completed_by_user_id (who marked it done)
alter table period_stages
  add column if not exists completed_by_user_id uuid references profiles(id);

-- Migrate existing done stages: set completed_at to updated_at if status = done
update period_stages
set completed_at = updated_at
where status = 'done' and completed_at is null;

-- ============================================================
-- DONE
-- ============================================================
