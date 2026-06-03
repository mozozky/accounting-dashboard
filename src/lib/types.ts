export type UserRole = "leader" | "staff";

export type StageStatus = "not_started" | "in_progress" | "done" | "blocked";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  password_set: boolean;
}

export interface UserRoleRow {
  user_id: string;
  role: UserRole;
}

export interface Client {
  id: string;
  name: string;
  pic_user_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TaskType {
  id: string;
  name: string;
  client_id: string | null;
  is_builtin: boolean;
  created_at: string;
}

export interface StageTemplate {
  id: string;
  client_id: string | null;
  task_type_id: string;
  stage_name: string;
  order_index: number;
  is_billable: boolean;
  is_active: boolean;
  hard_deadline_day: number | null;
  default_deadline_day: number | null;
}

export interface ClientPeriod {
  id: string;
  client_id: string;
  task_type_id: string;
  period_month: number;
  period_year: number;
  hard_deadline: string | null;
  created_at: string;
}

export interface PeriodStage {
  id: string;
  period_id: string;
  stage_name: string;
  order_index: number;
  status: StageStatus;
  internal_deadline: string | null;
  assignee_user_id: string | null;
  notes: string | null;
  updated_at: string;
}

export interface StageTask {
  id: string;
  stage_id: string;
  label: string;
  is_done: boolean;
  order_index: number;
}

export interface ClientWithPeriod extends Client {
  period: ClientPeriod | null;
  stages: PeriodStage[] | null;
  stageProgress: { done: number; total: number } | null;
}
