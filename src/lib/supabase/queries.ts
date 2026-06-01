import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientPeriod,
  PeriodStage,
  StageTask,
  StageTemplate,
  Profile,
  TaskType,
} from "@/lib/types";

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getClient(clientId: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return null;
  return data;
}

export async function getTaskTypes(): Promise<TaskType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_types")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getBuiltInTaskTypes(): Promise<TaskType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_types")
    .select("*")
    .eq("is_builtin", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getClientPeriod(
  clientId: string,
  taskTypeId: string,
  month: number,
  year: number
): Promise<ClientPeriod | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_periods")
    .select("*")
    .eq("client_id", clientId)
    .eq("task_type_id", taskTypeId)
    .eq("period_month", month)
    .eq("period_year", year)
    .single();

  if (error) return null;
  return data;
}

export async function getPeriodStages(
  periodId: string
): Promise<PeriodStage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("period_stages")
    .select("*")
    .eq("period_id", periodId)
    .order("order_index");

  if (error) throw error;
  return data ?? [];
}

export async function getStageTasks(stageId: string): Promise<StageTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_tasks")
    .select("*")
    .eq("stage_id", stageId)
    .order("order_index");

  if (error) throw error;
  return data ?? [];
}

export async function getStageTemplates(
  clientId: string,
  taskTypeId: string
): Promise<StageTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_templates")
    .select("*")
    .eq("client_id", clientId)
    .eq("task_type_id", taskTypeId)
    .eq("is_active", true)
    .order("order_index");

  if (error) throw error;
  return data ?? [];
}

export async function getClientAssignedTaskTypes(
  clientId: string
): Promise<TaskType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_templates")
    .select("task_type_id")
    .eq("client_id", clientId)
    .eq("is_active", true);

  if (error) throw error;

  const taskTypeIds = Array.from(
    new Set((data ?? []).map((r) => r.task_type_id))
  );

  if (taskTypeIds.length === 0) return [];

  const { data: taskTypes } = await supabase
    .from("task_types")
    .select("*")
    .in("id", taskTypeIds)
    .order("name");

  return (taskTypes ?? []) as TaskType[];
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) throw error;
  return data ?? [];
}

export async function getTeamMembers(): Promise<
  (Profile & { role: string })[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(role)")
    .order("full_name");

  if (error) throw error;
  return data ?? [];
}

export async function getCurrentUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  return roleData?.role ?? null;
}

export async function getAllPeriodsForMonth(
  month: number,
  year: number
): Promise<
  (ClientPeriod & { client: Client; period_stages: PeriodStage[] })[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_periods")
    .select("*, client:clients(*), period_stages(*)")
    .eq("period_month", month)
    .eq("period_year", year)
    .order("created_at");

  if (error) throw error;
  return data ?? [];
}

export async function getAllClientTaskTypePairs(): Promise<
  {
    client_id: string;
    client_name: string;
    task_type_id: string;
    task_type_name: string;
  }[]
> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("stage_templates")
    .select("client_id, task_type_id")
    .eq("is_active", true)
    .not("client_id", "is", null);

  if (!rows || rows.length === 0) return [];

  const seen = new Set<string>();
  const uniquePairs: { client_id: string; task_type_id: string }[] = [];

  for (const row of rows) {
    const key = `${row.client_id}-${row.task_type_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePairs.push({
      client_id: row.client_id,
      task_type_id: row.task_type_id,
    });
  }

  const clientIds = Array.from(new Set(uniquePairs.map((p) => p.client_id)));
  const taskTypeIds = Array.from(new Set(uniquePairs.map((p) => p.task_type_id)));

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds);

  const { data: taskTypes } = await supabase
    .from("task_types")
    .select("id, name")
    .in("id", taskTypeIds);

  const clientNameMap = new Map(
    (clients ?? []).map((c) => [c.id, c.name])
  );
  const taskTypeNameMap = new Map(
    (taskTypes ?? []).map((t) => [t.id, t.name])
  );

  return uniquePairs.map((p) => ({
    client_id: p.client_id,
    client_name: clientNameMap.get(p.client_id) ?? "",
    task_type_id: p.task_type_id,
    task_type_name: taskTypeNameMap.get(p.task_type_id) ?? "",
  }));
}
