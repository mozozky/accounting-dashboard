-- ============================================================
-- 017_backfill_assignee_may.sql
-- Run this in Supabase SQL Editor AFTER 016.
--
-- One-time backfill: the auto-assign-PIC feature (migration 016 +
-- PR #14) only fills assignee at the moment a period is generated.
-- Periods that already existed before that feature (e.g. May 2026)
-- still have empty assignees.
--
-- This script fills assignee_user_id from the client PIC for the
-- May 2026 periods only. It is SAFE:
--   - only touches stages where assignee_user_id IS NULL
--     (anything the team already assigned manually is left alone)
--   - only for clients that actually have a PIC set
--   - scoped strictly to period_month = 5, period_year = 2026
--
-- Idempotent: re-running changes nothing once assignees are set,
-- because the NULL filter no longer matches.
-- ============================================================

update period_stages ps
set assignee_user_id = c.pic_user_id,
    updated_at = now()
from client_periods cp
join clients c on c.id = cp.client_id
where ps.period_id = cp.id
  and ps.assignee_user_id is null        -- never overwrite a manual assignment
  and c.pic_user_id is not null          -- only clients that have a PIC
  and cp.period_month = 5
  and cp.period_year = 2026;

-- ============================================================
-- DONE
-- After running, verify in the dashboard: May 2026 stages for
-- clients with a PIC should now show that PIC as assignee.
-- ============================================================
