-- ============================================================
-- 011_stage_task_templates.sql
-- Recurring task checklist templates per stage template
-- ============================================================

create table if not exists stage_task_templates (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references stage_templates(id) on delete cascade,
  label text not null,
  order_index int default 0
);

alter table stage_task_templates enable row level security;

create policy "authenticated full access" on stage_task_templates
  for all using (auth.role() = 'authenticated');
