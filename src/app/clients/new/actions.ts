"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function addClient(formData: FormData) {
  const name = formData.get("name") as string;
  const picUserId = formData.get("pic_user_id") as string;
  const contactName = formData.get("contact_name") as string;
  const contactEmail = formData.get("contact_email") as string;
  const contactPhone = formData.get("contact_phone") as string;

  if (!name) return { error: "Client name is required" };

  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name,
      pic_user_id: picUserId || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    })
    .select()
    .single();

  if (error || !client) {
    return { error: error?.message ?? "Failed to create client" };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch all built-in task types
  const { data: builtInTaskTypes } = await supabase
    .from("task_types")
    .select("id")
    .eq("is_builtin", true)
    .is("client_id", null);

  for (const tt of builtInTaskTypes ?? []) {
    // Copy default stages to client
    const { data: defaultStages } = await supabase
      .from("stage_templates")
      .select("stage_name, order_index, is_billable, hard_deadline_day, default_deadline_day")
      .eq("task_type_id", tt.id)
      .is("client_id", null)
      .eq("is_active", true)
      .order("order_index");

    if (!defaultStages || defaultStages.length === 0) continue;

    const hardDeadlineDay = defaultStages[0]?.hard_deadline_day ?? null;
    const stageInserts = defaultStages.map((s) => ({
      client_id: client.id,
      task_type_id: tt.id,
      stage_name: s.stage_name,
      order_index: s.order_index,
      is_billable: s.is_billable,
      is_active: true,
      hard_deadline_day: hardDeadlineDay,
      default_deadline_day: s.default_deadline_day ?? null,
    }));

    await supabase.from("stage_templates").upsert(stageInserts, {
      onConflict: "client_id, task_type_id, order_index",
    });

    // Create period for current month
    const hardDeadline = computeDeadline(month, year, hardDeadlineDay);

    const { data: period } = await supabase
      .from("client_periods")
      .insert({
        client_id: client.id,
        task_type_id: tt.id,
        period_month: month,
        period_year: year,
        hard_deadline: hardDeadline,
      })
      .select()
      .single();

    if (!period) continue;

    const stageSnapshots = defaultStages.map((s) => ({
      period_id: period.id,
      stage_name: s.stage_name,
      order_index: s.order_index,
      status: "not_started",
      internal_deadline: computeDeadline(month, year, s.default_deadline_day ?? null),
    }));

    await supabase.from("period_stages").insert(stageSnapshots);

    const { data: newStages } = await supabase
      .from("period_stages")
      .select("id, order_index")
      .eq("period_id", period.id)
      .order("order_index");

    const { data: clientTemplates } = await supabase
      .from("stage_templates")
      .select("id, order_index")
      .eq("client_id", client.id)
      .eq("task_type_id", tt.id)
      .order("order_index");

    if (newStages && clientTemplates) {
      for (const ct of clientTemplates) {
        const ns = newStages.find((s) => s.order_index === ct.order_index);
        if (!ns) continue;
        const { data: tmpls } = await supabase
          .from("stage_task_templates")
          .select("label, order_index")
          .eq("template_id", ct.id)
          .order("order_index");

        if (tmpls && tmpls.length > 0) {
          await supabase.from("stage_tasks").insert(
            tmpls.map((t) => ({
              stage_id: ns.id,
              label: t.label,
              order_index: t.order_index,
            }))
          );
        }
      }
    }
  }

  redirect(`/clients/${client.id}/settings?new=1`);
}
