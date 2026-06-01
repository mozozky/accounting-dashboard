import { createClient } from "@/lib/supabase/server";
import QuickStatsBar from "@/components/dashboard/QuickStatsBar";
import ClientsTable from "@/components/dashboard/ClientsTable";
import PriorMonthsTable from "@/components/dashboard/PriorMonthsTable";
import MonthSwitcher from "@/components/dashboard/MonthSwitcher";
import ExportButton from "@/components/dashboard/ExportButton";
import type { ClientRow } from "@/components/dashboard/ClientsTable";
import type { PriorRow } from "@/components/dashboard/PriorMonthsTable";
import type { StageStatus } from "@/lib/types";

function determineStatus(
  stages: { status: StageStatus }[],
  hardDeadline: string | null
): StageStatus | "overdue" | "no_period" {
  if (stages.length === 0) return "no_period";

  const hasBlocked = stages.some((s) => s.status === "blocked");
  if (hasBlocked) return "blocked";

  const allDone = stages.every((s) => s.status === "done");
  if (!allDone && hardDeadline) {
    const deadline = new Date(hardDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    if (deadline < today) return "overdue";
  }

  if (allDone) return "done";

  const hasInProgress = stages.some((s) => s.status === "in_progress");
  if (hasInProgress) return "in_progress";

  const allNotStarted = stages.every((s) => s.status === "not_started");
  if (allNotStarted) return "not_started";

  return "in_progress";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = await createClient();
  const now = new Date();

  const selectedMonth =
    parseInt(searchParams?.month ?? "") ||
    now.getMonth() + 1;
  const selectedYear =
    parseInt(searchParams?.year ?? "") || now.getFullYear();

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

  const taskTypeIds = Array.from(
    new Set(pairs.map((p) => p.taskTypeId))
  );

  let taskTypeMap = new Map<string, string>();
  if (taskTypeIds.length > 0) {
    const { data: taskTypes } = await supabase
      .from("task_types")
      .select("id, name")
      .in("id", taskTypeIds);
    taskTypeMap = new Map((taskTypes ?? []).map((t) => [t.id, t.name]));
  }

  // --- Fetch periods for SELECTED month ---
  const { data: selectedPeriods } = await supabase
    .from("client_periods")
    .select(
      "id, client_id, task_type_id, hard_deadline, period_stages(id, status, stage_name, order_index, completed_at, completed_by_user_id)"
    )
    .eq("period_month", selectedMonth)
    .eq("period_year", selectedYear);

  interface StageData {
    status: string;
    stage_name: string;
    order_index: number;
    completed_at: string | null;
    completed_by_user_id: string | null;
  }

  const periodByClientTask = new Map<
    string,
    { id: string; hard_deadline: string | null; stages: StageData[] }
  >();

  const allCompletedByIds = new Set<string>();

  for (const p of selectedPeriods ?? []) {
    const key = `${p.client_id}-${p.task_type_id}`;
    const stages = p.period_stages ?? [];
    for (const s of stages) {
      if (s.completed_by_user_id) allCompletedByIds.add(s.completed_by_user_id);
    }
    periodByClientTask.set(key, {
      id: p.id,
      hard_deadline: p.hard_deadline,
      stages,
    });
  }

  let completedByNameMap = new Map<string, string>();
  if (allCompletedByIds.size > 0) {
    const { data: completedByProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(allCompletedByIds));
    completedByNameMap = new Map(
      (completedByProfiles ?? []).map((p) => [p.id, p.full_name ?? ""])
    );
  }

  // --- Build selected month rows ---
  const todayStr = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekStr = weekFromNow.toISOString().split("T")[0];

  let totalActive = 0;
  let overdueCount = 0;
  let dueThisWeekCount = 0;
  let doneThisMonthCount = 0;

  const clientRows: ClientRow[] = pairs
    .map(({ clientId, taskTypeId }) => {
      const client = clientMap.get(clientId);
      if (!client) return null;

      totalActive++;
      const periodKey = `${clientId}-${taskTypeId}`;
      const period = periodByClientTask.get(periodKey);
      const stages = period?.stages ?? [];
      const hardDeadline = period?.hard_deadline ?? null;
      const status = period
        ? determineStatus(stages as { status: StageStatus }[], hardDeadline)
        : "no_period";
      const doneCount = stages.filter((s) => s.status === "done").length;

      if (status === "overdue") overdueCount++;
      if (status === "done") doneThisMonthCount++;

      if (
        hardDeadline &&
        hardDeadline >= todayStr &&
        hardDeadline <= weekStr &&
        status !== "done"
      ) {
        dueThisWeekCount++;
      }

      const sortedStages = (stages as StageData[])
        .slice()
        .sort((a, b) => a.order_index - b.order_index);

      const stageDetails = sortedStages.map((s) => ({
        stage_name: s.stage_name,
        status: s.status as StageStatus,
        completed_at: s.completed_at,
        completed_by_name: s.completed_by_user_id
          ? completedByNameMap.get(s.completed_by_user_id) ?? null
          : null,
      }));

      const timelineStages = sortedStages.map((s) => ({
        status: s.status as StageStatus,
        stage_name: s.stage_name,
      }));

      return {
        clientId,
        clientName: client.name,
        taskTypeId,
        taskTypeName: taskTypeMap.get(taskTypeId) ?? "",
        picName: profileMap.get(client.pic_user_id ?? "") ?? null,
        periodId: period?.id ?? null,
        stages: timelineStages,
        stageDetails,
        stageProgress: { done: doneCount, total: stages.length },
        hardDeadline,
        status,
        hasPeriod: !!period,
        periodMonth: selectedMonth,
        periodYear: selectedYear,
      };
    })
    .filter(Boolean) as ClientRow[];

  clientRows.sort((a, b) => {
    if (a.clientName !== b.clientName)
      return a.clientName.localeCompare(b.clientName);
    return a.taskTypeName.localeCompare(b.taskTypeName);
  });

  // --- Fetch PRIOR unfinished periods (months before selectedMonth) ---
  const { data: priorPeriods } = await supabase
    .from("client_periods")
    .select("id, client_id, task_type_id, hard_deadline, period_month, period_year, period_stages(status)")
    .or(
      `period_year.lt.${selectedYear},and(period_year.eq.${selectedYear},period_month.lt.${selectedMonth})`
    );

  let priorUnfinishedCount = 0;
  const priorRows: PriorRow[] = [];

  for (const pp of priorPeriods ?? []) {
    const stages = pp.period_stages ?? [];
    const status = determineStatus(
      stages as { status: StageStatus }[],
      pp.hard_deadline
    );

    if (status === "done" || status === "not_started" || status === "no_period") continue;

    priorUnfinishedCount++;

    const client = clientMap.get(pp.client_id);
    priorRows.push({
      clientId: pp.client_id,
      clientName: client?.name ?? "",
      taskTypeName: taskTypeMap.get(pp.task_type_id) ?? "",
      periodId: pp.id,
      periodMonth: pp.period_month,
      periodYear: pp.period_year,
      stageProgress: {
        done: stages.filter((s: { status: string }) => s.status === "done").length,
        total: stages.length,
      },
      hardDeadline: pp.hard_deadline,
      status: status as StageStatus | "overdue",
    });
  }

  priorRows.sort((a, b) => {
    if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
    return b.periodMonth - a.periodMonth;
  });

  // --- Pic + task type options ---
  const picOptions = (clients ?? [])
    .filter((c) => c.pic_user_id)
    .map((c) => ({
      id: c.pic_user_id!,
      name: profileMap.get(c.pic_user_id!) ?? null,
    }));

  const seenPicNames = new Set<string>();
  const uniquePicOptions = picOptions.filter((p) => {
    if (!p.name || seenPicNames.has(p.name)) return false;
    seenPicNames.add(p.name);
    return true;
  });

  const taskTypeNames = Array.from(
    new Set(clientRows.map((r) => r.taskTypeName).filter(Boolean))
  ).sort();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <MonthSwitcher month={selectedMonth} year={selectedYear} />
        </div>
        <ExportButton month={selectedMonth} year={selectedYear} />
      </div>

      <div className="mb-8">
        <QuickStatsBar
          totalActive={totalActive}
          overdue={overdueCount}
          dueThisWeek={dueThisWeekCount}
          doneThisMonth={doneThisMonthCount}
          priorUnfinished={priorUnfinishedCount}
        />
      </div>

      <ClientsTable
        clients={clientRows}
        picOptions={uniquePicOptions}
        taskTypeOptions={taskTypeNames}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
      />

      <PriorMonthsTable rows={priorRows} />
    </div>
  );
}
