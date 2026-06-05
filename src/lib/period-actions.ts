"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StageStatus } from "@/lib/types";

const VALID_STATUSES: StageStatus[] = [
  "not_started",
  "in_progress",
  "done",
  "blocked",
];

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

type StageContext = {
  stageName: string;
  clientName: string;
  taskTypeName: string;
};

async function getStageContext(supabase: Awaited<ReturnType<typeof createClient>>, stageId: string): Promise<StageContext | null> {
  const { data: stage } = await supabase
    .from("period_stages")
    .select("stage_name, period:period_id(client:client_id(name), task_type:task_type_id(name))")
    .eq("id", stageId)
    .single();

  if (!stage) return null;
  const period = stage.period as unknown as {
    client: { name: string } | null;
    task_type: { name: string } | null;
  } | null;
  return {
    stageName: stage.stage_name,
    clientName: period?.client?.name ?? "",
    taskTypeName: period?.task_type?.name ?? "",
  };
}

export async function updateStageStatus(stageId: string, status: string) {
  if (!VALID_STATUSES.includes(status as StageStatus)) {
    return { error: `Invalid status: ${status}` };
  }
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

  const ctx = await getStageContext(supabase, stageId);
  if (ctx) {
    await logActivity(
      supabase,
      `Stage ${status.replace(/_/g, " ")}`,
      "period_stage",
      ctx.stageName,
      `${ctx.clientName} · ${ctx.taskTypeName}`
    );
  }

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

  const ctx = await getStageContext(supabase, stageId);
  if (ctx && deadline) {
    const formatted = new Date(deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    await logActivity(supabase, "Deadline updated", "period_stage", ctx.stageName, `${ctx.clientName} · ${ctx.taskTypeName} → ${formatted}`);
  }

  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function updateStagePlannedDate(stageId: string, date: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("period_stages")
    .update({
      planned_date: date,
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

  const ctx = await getStageContext(supabase, stageId);
  if (ctx) {
    let assigneeName = "Unassigned";
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      assigneeName = profile?.full_name ?? userId;
    }
    await logActivity(supabase, "PIC changed", "period_stage", ctx.stageName, `${ctx.clientName} · ${ctx.taskTypeName} → ${assigneeName}`);
  }

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

  if (deadline) {
    const { data: period } = await supabase
      .from("client_periods")
      .select("client:client_id(name), task_type:task_type_id(name)")
      .eq("id", periodId)
      .single();

    if (period) {
      const p = period as unknown as { client: { name: string } | null; task_type: { name: string } | null };
      const formatted = new Date(deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      await logActivity(supabase, "Hard deadline updated", "client_period", `${p.client?.name ?? ""} · ${p.task_type?.name ?? ""}`, formatted);
    }
  }

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

  const ctx = await getStageContext(supabase, stageId);
  await logActivity(supabase, "Task added", "stage_task", label, ctx ? `${ctx.clientName} · ${ctx.taskTypeName} → ${ctx.stageName}` : null);

  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function toggleStageTask(taskId: string, isDone: boolean) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("stage_tasks")
    .select("label, stage_id")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("stage_tasks")
    .update({ is_done: isDone })
    .eq("id", taskId);

  if (error) return { error: error.message };

  if (task) {
    const ctx = await getStageContext(supabase, (task as { stage_id: string }).stage_id);
    await logActivity(
      supabase,
      isDone ? "Task completed" : "Task reopened",
      "stage_task",
      (task as { label: string }).label,
      ctx ? `${ctx.clientName} · ${ctx.taskTypeName} → ${ctx.stageName}` : null
    );
  }

  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}

export async function deleteStageTask(taskId: string) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("stage_tasks")
    .select("label")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("stage_tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { error: error.message };

  if (task) {
    await logActivity(supabase, "Task deleted", "stage_task", (task as { label: string }).label);
  }

  revalidatePath("/clients/[clientId]/[periodId]", "page");
  return { success: true };
}
