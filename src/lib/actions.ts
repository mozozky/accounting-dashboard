"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function computeDeadline(month: number, year: number, day: number | null): string | null {
  if (!day) return null;
  const lastDay = new Date(year, month, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const m = String(month).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${year}-${m}-${d}`;
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

  const deadline = computeDeadline(
    month,
    year,
    templates[0]?.default_deadline_day ?? null
  );

  const { data: period, error: periodError } = await supabase
    .from("client_periods")
    .insert({
      client_id: clientId,
      task_type_id: taskTypeId,
      period_month: month,
      period_year: year,
      hard_deadline: deadline,
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
  }));

  await supabase.from("period_stages").insert(stages);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateNextMonthAction() {
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

    const deadline = computeDeadline(
      nextMonth,
      nextYear,
      templates[0]?.default_deadline_day ?? null
    );

    const { data: period } = await supabase
      .from("client_periods")
      .insert({
        client_id: clientId,
        task_type_id: taskTypeId,
        period_month: nextMonth,
        period_year: nextYear,
        hard_deadline: deadline,
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
    }));

    await supabase.from("period_stages").insert(stages);
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
