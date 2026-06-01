-- ============================================================
-- 008_add_password_flag.sql
-- Adds password_set column to profiles for invite flow safety
-- ============================================================

alter table profiles add column if not exists password_set boolean default false;

-- Backfill: existing users who already have a profile = already have password
update profiles set password_set = true where password_set = false;
