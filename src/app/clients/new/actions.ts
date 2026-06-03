"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function computeDeadline(month: number, year: number, day: number | null): string | null {
  if (!day) return null;
  const lastDay = new Date(year, month, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const m = String(month).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${year}-${m}-${d}`;
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
      .select("stage_name, order_index, is_billable, default_deadline_day")
      .eq("task_type_id", tt.id)
      .is("client_id", null)
      .eq("is_active", true)
      .order("order_index");

    if (!defaultStages || defaultStages.length === 0) continue;

    const deadlineDay = defaultStages[0]?.default_deadline_day ?? null;
    const stageInserts = defaultStages.map((s) => ({
      client_id: client.id,
      task_type_id: tt.id,
      stage_name: s.stage_name,
      order_index: s.order_index,
      is_billable: s.is_billable,
      is_active: true,
      default_deadline_day: deadlineDay,
    }));

    await supabase.from("stage_templates").upsert(stageInserts, {
      onConflict: "client_id, task_type_id, order_index",
    });

    // Create period for current month
    const deadline = computeDeadline(month, year, deadlineDay);

    const { data: period } = await supabase
      .from("client_periods")
      .insert({
        client_id: client.id,
        task_type_id: tt.id,
        period_month: month,
        period_year: year,
        hard_deadline: deadline,
      })
      .select()
      .single();

    if (!period) continue;

    const stageSnapshots = stageInserts.map((s) => ({
      period_id: period.id,
      stage_name: s.stage_name,
      order_index: s.order_index,
      status: "not_started",
    }));

    await supabase.from("period_stages").insert(stageSnapshots);
  }

  redirect(`/clients/${client.id}/settings?new=1`);
}
