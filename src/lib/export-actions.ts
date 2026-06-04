"use server";

import { createClient } from "@/lib/supabase/server";
import { determineStatus } from "@/lib/utils/date";

const CSV_HEADERS = [
  "Client",
  "Task Type",
  "Stage",
  "Status",
  "PIC",
  "Progress",
  "Deadline",
];

/** Maps OverallStatus to a human-readable CSV label. */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    blocked: "Blocked",
    overdue: "Overdue",
    done: "Done",
    in_progress: "In Progress",
    not_started: "Not Started",
    no_period: "No Period",
  };
  return map[status] ?? status;
}

export async function exportDashboardCSV(month: number, year: number) {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, pic_user_id")
    .eq("is_active", true)
    .order("name");

  if (!clients || clients.length === 0) {
    return { csv: "", message: "No active clients found" };
  }

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const picUserIds = Array.from(
    new Set(clients.map((c) => c.pic_user_id).filter(Boolean))
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

  if (!templateRows || templateRows.length === 0) {
    return { csv: "", message: "No assigned task types found" };
  }

  const seen = new Set<string>();
  const pairs: { clientId: string; taskTypeId: string }[] = [];
  for (const row of templateRows) {
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
    .select(
      "client_id, task_type_id, hard_deadline, period_stages(status, stage_name, order_index)"
    )
    .eq("period_month", month)
    .eq("period_year", year);

  interface StageRow {
    status: string;
    stage_name: string;
    order_index: number;
  }

  const periodByClientTask = new Map<
    string,
    {
      hard_deadline: string | null;
      done: number;
      total: number;
      status: string;
      stage: string;
    }
  >();

  for (const p of periods ?? []) {
    const stages = ((p.period_stages ?? []) as StageRow[]).sort(
      (a, b) => a.order_index - b.order_index
    );
    const done = stages.filter((s) => s.status === "done").length;

    // Use shared determineStatus (WIB-aware, single source of truth)
    const overallStatus = determineStatus(stages, p.hard_deadline);

    // Active stage: first in_progress, then first blocked, then first not_started
    const activeStage =
      stages.find((s) => s.status === "in_progress") ??
      stages.find((s) => s.status === "blocked") ??
      stages.find((s) => s.status === "not_started") ??
      stages[stages.length - 1];

    periodByClientTask.set(`${p.client_id}-${p.task_type_id}`, {
      hard_deadline: p.hard_deadline,
      done,
      total: stages.length,
      status: statusLabel(overallStatus),
      stage: activeStage?.stage_name ?? "-",
    });
  }

  const rows: string[][] = [];

  for (const { clientId, taskTypeId } of pairs) {
    const client = clientMap.get(clientId);
    if (!client) continue;

    const period = periodByClientTask.get(`${clientId}-${taskTypeId}`);
    const progress = period ? `${period.done}/${period.total}` : "-";
    const status = period?.status ?? "No Period";
    const stage = period?.stage ?? "-";
    const deadline = period?.hard_deadline ?? "-";
    const picName = profileMap.get(client.pic_user_id ?? "") ?? "-";
    const taskTypeName = taskTypeMap.get(taskTypeId) ?? "";

    rows.push([client.name, taskTypeName, stage, status, picName, progress, deadline]);
  }

  if (rows.length === 0) {
    return { csv: "", message: "No data to export for this month" };
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
    "\uFEFF" + CSV_HEADERS.join(","), // BOM for Excel compatibility
    ...rows.map((r) => r.map(escapeCSV).join(",")),
  ].join("\n");

  return { csv };
}
