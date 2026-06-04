-- ============================================================
-- 014_fix_user_delete_fks.sql
-- Run this in Supabase SQL Editor.
--
-- Fixes: "Database error deleting user" when removing a team member.
--
-- Root cause: three foreign keys reference profiles(id) with the default
-- ON DELETE NO ACTION (RESTRICT). Deleting an auth user cascades to
-- profiles, but that cascade is blocked if the user is referenced as a
-- client PIC, a stage assignee, or the person who completed a stage.
--
-- Fix: change those FKs to ON DELETE SET NULL so the references are
-- nulled out (client becomes "Unassigned", stage becomes "Unassigned")
-- instead of blocking the delete.
-- ============================================================

-- clients.pic_user_id
alter table clients
  drop constraint if exists clients_pic_user_id_fkey;
alter table clients
  add constraint clients_pic_user_id_fkey
  foreign key (pic_user_id) references profiles(id) on delete set null;

-- period_stages.assignee_user_id
alter table period_stages
  drop constraint if exists period_stages_assignee_user_id_fkey;
alter table period_stages
  add constraint period_stages_assignee_user_id_fkey
  foreign key (assignee_user_id) references profiles(id) on delete set null;

-- period_stages.completed_by_user_id
alter table period_stages
  drop constraint if exists period_stages_completed_by_user_id_fkey;
alter table period_stages
  add constraint period_stages_completed_by_user_id_fkey
  foreign key (completed_by_user_id) references profiles(id) on delete set null;

-- ============================================================
-- DONE
-- ============================================================
