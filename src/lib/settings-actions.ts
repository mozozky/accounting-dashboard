"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateClientInfo(
  clientId: string,
  data: {
    name: string;
    pic_user_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", clientId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveClient(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: false })
    .eq("id", clientId);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function upsertStageTemplate(
  id: string | null,
  data: {
    client_id: string;
    task_type_id: string;
    stage_name: string;
    order_index: number;
    is_billable: boolean;
    is_active: boolean;
  }
) {
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("stage_templates")
      .update({
        stage_name: data.stage_name,
        is_billable: data.is_billable,
        is_active: data.is_active,
      })
      .eq("id", id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("stage_templates")
      .insert(data);

    if (error) return { error: error.message };
  }

  revalidatePath("/clients/[clientId]/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStageTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/settings");
  return { success: true };
}

export async function reorderStageTemplates(
  clientId: string,
  taskTypeId: string,
  stageIds: string[]
) {
  const supabase = await createClient();

  const updates = stageIds.map((id, index) => ({
    id,
    client_id: clientId,
    task_type_id: taskTypeId,
    order_index: index,
  }));

  const { error } = await supabase
    .from("stage_templates")
    .upsert(updates, { onConflict: "client_id, task_type_id, order_index" });

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/settings");
  return { success: true };
}

export async function addStageTemplate(
  clientId: string,
  taskTypeId: string,
  stageName: string
) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("stage_templates")
    .select("order_index")
    .eq("client_id", clientId)
    .eq("task_type_id", taskTypeId)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (last?.order_index ?? -1) + 1;

  const { data: stage, error } = await supabase
    .from("stage_templates")
    .insert({
      client_id: clientId,
      task_type_id: taskTypeId,
      stage_name: stageName,
      order_index: nextOrder,
      is_billable: false,
      is_active: true,
    })
    .select()
    .single();

  if (error || !stage) return { error: error?.message ?? "Failed" };
  revalidatePath("/clients/[clientId]/settings");
  return {
    success: true,
    stage: {
      id: stage.id,
      stage_name: stage.stage_name,
      order_index: stage.order_index,
      is_billable: stage.is_billable,
      is_active: stage.is_active,
    },
  };
}

export async function createCustomTaskType(clientId: string, name: string) {
  const supabase = await createClient();

  const { data: taskType, error } = await supabase
    .from("task_types")
    .insert({
      name,
      client_id: clientId,
      is_builtin: false,
    })
    .select()
    .single();

  if (error || !taskType) return { error: error?.message ?? "Failed" };

  revalidatePath("/clients/[clientId]/settings");
  return { success: true, taskType };
}

export async function unassignTaskTypeFromClient(
  clientId: string,
  taskTypeId: string
): Promise<{ error?: string; success?: boolean }> {

  try {
    const supabase = await createClient();

    const { data: taskType } = await supabase
      .from("task_types")
      .select("id, is_builtin, client_id")
      .eq("id", taskTypeId)
      .single();

    const { data: periodIds } = await supabase
      .from("client_periods")
      .select("id")
      .eq("client_id", clientId)
      .eq("task_type_id", taskTypeId);

    if (periodIds && periodIds.length > 0) {
      const ids = periodIds.map((p) => p.id);
      await supabase.from("period_stages").delete().in("period_id", ids);
      await supabase.from("client_periods").delete().in("id", ids);
    }

    await supabase
      .from("stage_templates")
      .delete()
      .eq("client_id", clientId)
      .eq("task_type_id", taskTypeId);

    if (taskType && !taskType.is_builtin) {
      await supabase.from("task_types").delete().eq("id", taskTypeId);
    }

    revalidatePath("/clients/[clientId]/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to unassign task type" };
  }
}

export async function updateHardDeadlineDay(
  clientId: string,
  taskTypeId: string,
  day: number | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_templates")
    .update({ hard_deadline_day: day })
    .eq("client_id", clientId)
    .eq("task_type_id", taskTypeId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/settings");
  return { success: true };
}

export async function updateStageDeadlineDay(
  stageId: string,
  day: number | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_templates")
    .update({ default_deadline_day: day })
    .eq("id", stageId);

  if (error) return { error: error.message };
  revalidatePath("/clients/[clientId]/settings");
  return { success: true };
}
