"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityType: string,
  entityName?: string | null,
  details?: string | null
) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .single();
  await supabase.from("activity_log").insert({
    user_id: data.user.id,
    user_name: profile?.full_name ?? data.user.email,
    action,
    entity_type: entityType,
    entity_name: entityName ?? null,
    details: details ?? null,
  });
}

export async function updateStageStatus(stageId: string, status: string) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "done") {
    updateData.completed_at = new Date().toISOString();
    const { data } = await supabase.auth.getUser();
    updateData.completed_by_user_id = data.user?.id ?? null;
  } else {
    updateData.completed_at = null;
    updateData.completed_by_user_id = null;
  }

  const { error } = await supabase
    .from("period_stages")
    .update(updateData)
    .eq("id", stageId);

  if (error) return { error: error.message };
  await logActivity(supabase, `Stage ${status}`, "period_stage", `Stage: ${status}`);
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  revalidatePath("/dashboard", "page");
  return { success: true };
}

export async function updateStageDeadline(stageId: string, deadline: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("period_stages")
    .update({
      internal_deadline: deadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function updateStageAssignee(stageId: string, userId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("period_stages")
    .update({ assignee_user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function updateStageNotes(stageId: string, notes: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("period_stages")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function updatePeriodDeadline(periodId: string, deadline: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_periods")
    .update({ hard_deadline: deadline })
    .eq("id", periodId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function addStageTask(stageId: string, label: string) {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("stage_tasks")
    .select("order_index")
    .eq("stage_id", stageId)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (last?.order_index ?? -1) + 1;

  const { error } = await supabase.from("stage_tasks").insert({
    stage_id: stageId,
    label,
    order_index: nextOrder,
  });

  if (error) return { error: error.message };
  await logActivity(supabase, "Task added", "stage_task", label);
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function toggleStageTask(taskId: string, isDone: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_tasks")
    .update({ is_done: isDone })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function deleteStageTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}
