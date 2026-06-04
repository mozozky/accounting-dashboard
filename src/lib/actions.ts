"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/lib/auth-utils";

function computeDeadline(month: number, year: number, day: number | null): string | null {
  if (!day) return null;
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const m = String(nextMonth).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${nextYear}-${m}-${d}`;
}

export async function generatePeriodForClientAction(
  clientId: string,
  taskTypeId: string,
  month: number,
  year: number
) {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("stage_templates")
    .select("*")
    .eq("client_id", clientId)
    .eq("task_type_id", taskTypeId)
    .eq("is_active", true)
    .order("order_index");

  if (!templates || templates.length === 0) {
    return { error: "No active stage templates for this client + task type" };
  }

  const hardDeadline = computeDeadline(
    month,
    year,
    templates[0]?.hard_deadline_day ?? null
  );

  const { data: period, error: periodError } = await supabase
    .from("client_periods")
    .insert({
      client_id: clientId,
      task_type_id: taskTypeId,
      period_month: month,
      period_year: year,
      hard_deadline: hardDeadline,
    })
    .select()
    .single();

  if (periodError || !period) {
    if (periodError?.code === "23505") {
      return { error: "Period already exists" };
    }
    return { error: periodError?.message ?? "Failed to create period" };
  }

  const stages = templates.map((t) => ({
    period_id: period.id,
    stage_name: t.stage_name,
    order_index: t.order_index,
    status: "not_started",
    internal_deadline: computeDeadline(month, year, t.default_deadline_day ?? null),
  }));

  await supabase.from("period_stages").insert(stages);

  const { data: newStages } = await supabase
    .from("period_stages")
    .select("id, order_index")
    .eq("period_id", period.id)
    .order("order_index");

  if (newStages && templates) {
    for (let i = 0; i < templates.length; i++) {
      const stage = newStages[i];
      if (!stage) continue;
      const { data: tmpls } = await supabase
        .from("stage_task_templates")
        .select("label, order_index")
        .eq("template_id", templates[i].id)
        .order("order_index");

      if (tmpls && tmpls.length > 0) {
        await supabase.from("stage_tasks").insert(
          tmpls.map((t) => ({
            stage_id: stage.id,
            label: t.label,
            order_index: t.order_index,
          }))
        );
      }
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateNextMonthAction() {
  const denied = await requireLeader();
  if (denied) return { error: denied.error };

  const supabase = await createClient();

  const now = new Date();
  let nextMonth = now.getMonth() + 2;
  let nextYear = now.getFullYear();
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const { data: pairs } = await supabase
    .from("stage_templates")
    .select("client_id, task_type_id")
    .eq("is_active", true)
    .not("client_id", "is", null);

  if (!pairs || pairs.length === 0) {
    return { error: "No active client-task assignments" };
  }

  const seen = new Set<string>();
  const combos: { clientId: string; taskTypeId: string }[] = [];

  for (const p of pairs) {
    const key = `${p.client_id}-${p.task_type_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combos.push({ clientId: p.client_id, taskTypeId: p.task_type_id });
  }

  let created = 0;
  let skipped = 0;

  for (const { clientId, taskTypeId } of combos) {
    const { data: templates } = await supabase
      .from("stage_templates")
      .select("*")
      .eq("client_id", clientId)
      .eq("task_type_id", taskTypeId)
      .eq("is_active", true)
      .order("order_index");

    if (!templates || templates.length === 0) {
      skipped++;
      continue;
    }

    const existing = await supabase
      .from("client_periods")
      .select("id")
      .eq("client_id", clientId)
      .eq("task_type_id", taskTypeId)
      .eq("period_month", nextMonth)
      .eq("period_year", nextYear)
      .maybeSingle();

    if (existing.data) {
      skipped++;
      continue;
    }

    const hardDeadline = computeDeadline(
      nextMonth,
      nextYear,
      templates[0]?.hard_deadline_day ?? null
    );

    const { data: period } = await supabase
      .from("client_periods")
      .insert({
        client_id: clientId,
        task_type_id: taskTypeId,
        period_month: nextMonth,
        period_year: nextYear,
        hard_deadline: hardDeadline,
      })
      .select()
      .single();

    if (!period) {
      skipped++;
      continue;
    }

    const stages = templates.map((t) => ({
      period_id: period.id,
      stage_name: t.stage_name,
      order_index: t.order_index,
      status: "not_started",
      internal_deadline: computeDeadline(nextMonth, nextYear, t.default_deadline_day ?? null),
    }));

    await supabase.from("period_stages").insert(stages);

    const { data: newStages } = await supabase
      .from("period_stages")
      .select("id, order_index")
      .eq("period_id", period.id)
      .order("order_index");

    if (newStages && templates) {
      for (let i = 0; i < templates.length; i++) {
        const stage = newStages[i];
        if (!stage) continue;
        const { data: tmpls } = await supabase
          .from("stage_task_templates")
          .select("label, order_index")
          .eq("template_id", templates[i].id)
          .order("order_index");

        if (tmpls && tmpls.length > 0) {
          await supabase.from("stage_tasks").insert(
            tmpls.map((t) => ({
              stage_id: stage.id,
              label: t.label,
              order_index: t.order_index,
            }))
          );
        }
      }
    }

    created++;
  }

  revalidatePath("/dashboard");
  return { success: true, created, skipped };
}

export async function assignTaskTypeToClientAction(
  clientId: string,
  taskTypeId: string
) {
  const supabase = await createClient();

  const { data: taskType } = await supabase
    .from("task_types")
    .select("*")
    .eq("id", taskTypeId)
    .single();

  if (!taskType) {
    return { error: "Task type not found" };
  }

  const isBuiltin = taskType.is_builtin;

  let query = supabase
    .from("stage_templates")
    .select("stage_name, order_index, is_billable")
    .eq("task_type_id", taskTypeId)
    .eq("is_active", true);

  if (isBuiltin) {
    query = query.is("client_id", null);
  } else {
    query = query.eq("client_id", taskType.client_id);
  }

  const { data: defaultStages, error: stagesError } = await query.order("order_index");

  if (stagesError || !defaultStages || defaultStages.length === 0) {
    return { error: "No stages defined for this task type" };
  }

  const insertData = defaultStages.map((s) => ({
    client_id: clientId,
    task_type_id: taskTypeId,
    stage_name: s.stage_name,
    order_index: s.order_index,
    is_billable: s.is_billable,
    is_active: true,
  }));

  const { error } = await supabase.from("stage_templates").upsert(insertData, {
    onConflict: "client_id, task_type_id, order_index",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/clients/[clientId]/settings", "layout");
  return { success: true };
}

export async function bulkAdvanceStage(periodIds: string[], status: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: currentUser } = await supabase.auth.getUser();
  const userId = currentUser?.user?.id;

  for (const periodId of periodIds) {
    const { data: stages } = await supabase
      .from("period_stages")
      .select("id, status")
      .eq("period_id", periodId)
      .neq("status", "done")
      .order("order_index")
      .limit(1);

    if (stages && stages[0]) {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: now,
      };
      if (status === "done") {
        updateData.completed_at = now;
        updateData.completed_by_user_id = userId ?? null;
      }
      await supabase.from("period_stages").update(updateData).eq("id", stages[0].id);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
