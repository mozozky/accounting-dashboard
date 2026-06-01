-- ============================================================
-- 007_drop_triggers.sql
-- Removes database triggers for profile/role creation.
-- Logic moved to Next.js auth callback (no cascade, no race condition).
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_profile_created on profiles;
drop function if exists handle_new_user();
drop function if exists handle_new_user_role();
