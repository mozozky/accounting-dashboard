"use server";

import { createClient } from "@/lib/supabase/server";

const CSV_HEADERS = [
  "Client",
  "Task Type",
  "PIC",
  "Progress",
  "Hard Deadline",
  "Status",
];

export async function exportDashboardCSV(month: number, year: number) {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, pic_user_id")
    .eq("is_active", true)
    .order("name");

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

  const picUserIds = Array.from(
    new Set((clients ?? []).map((c) => c.pic_user_id).filter(Boolean))
  ) as string[];

  let profileMap = new Map<string, string>();
  if (picUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", picUserIds);
    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name ?? ""])
    );
  }

  const { data: templateRows } = await supabase
    .from("stage_templates")
    .select("client_id, task_type_id")
    .eq("is_active", true)
    .not("client_id", "is", null);

  const seen = new Set<string>();
  const pairs: { clientId: string; taskTypeId: string }[] = [];
  for (const row of templateRows ?? []) {
    const key = `${row.client_id}-${row.task_type_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ clientId: row.client_id, taskTypeId: row.task_type_id });
  }

  const taskTypeIds = Array.from(new Set(pairs.map((p) => p.taskTypeId)));
  let taskTypeMap = new Map<string, string>();
  if (taskTypeIds.length > 0) {
    const { data: taskTypes } = await supabase
      .from("task_types")
      .select("id, name")
      .in("id", taskTypeIds);
    taskTypeMap = new Map((taskTypes ?? []).map((t) => [t.id, t.name]));
  }

  const { data: periods } = await supabase
    .from("client_periods")
    .select("client_id, task_type_id, hard_deadline, period_stages(status)")
    .eq("period_month", month)
    .eq("period_year", year);

  const periodByClientTask = new Map<string, {
    hard_deadline: string | null;
    done: number;
    total: number;
    status: string;
  }>();

  for (const p of periods ?? []) {
    const stages = p.period_stages ?? [];
    const done = stages.filter((s: { status: string }) => s.status === "done").length;

    let status = "No Period";
    if (stages.length > 0) {
      const hasBlocked = stages.some((s: { status: string }) => s.status === "blocked");
      if (hasBlocked) status = "Blocked";
      else if (stages.every((s: { status: string }) => s.status === "done")) status = "Done";
      else if (stages.some((s: { status: string }) => s.status === "in_progress")) status = "In Progress";
      else if (stages.every((s: { status: string }) => s.status === "not_started")) status = "Not Started";
      else if (p.hard_deadline) {
        const deadline = new Date(p.hard_deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);
        if (deadline < today) status = "Overdue";
      }
    }

    periodByClientTask.set(`${p.client_id}-${p.task_type_id}`, {
      hard_deadline: p.hard_deadline,
      done,
      total: stages.length,
      status,
    });
  }

  const rows: string[][] = [];

  for (const { clientId, taskTypeId } of pairs) {
    const client = clientMap.get(clientId);
    if (!client) continue;

    const period = periodByClientTask.get(`${clientId}-${taskTypeId}`);
    const progress = period ? `${period.done}/${period.total}` : "-";
    const status = period?.status ?? "No Period";
    const deadline = period?.hard_deadline ?? "-";
    const picName = profileMap.get(client.pic_user_id ?? "") ?? "-";
    const taskTypeName = taskTypeMap.get(taskTypeId) ?? "";

    rows.push([
      client.name,
      taskTypeName,
      picName,
      progress,
      deadline,
      status,
    ]);
  }

  rows.sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    return a[1].localeCompare(b[1]);
  });

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [
    CSV_HEADERS.join(","),
    ...rows.map((r) => r.map(escapeCSV).join(",")),
  ].join("\n");

  return { csv };
}
