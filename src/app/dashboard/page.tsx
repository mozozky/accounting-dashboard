import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import ClientsTable from "@/components/dashboard/ClientsTable";
import MonthSummary from "@/components/dashboard/MonthSummary";
import PriorMonthsTable from "@/components/dashboard/PriorMonthsTable";
import MonthSwitcher from "@/components/dashboard/MonthSwitcher";
import ExportButton from "@/components/dashboard/ExportButton";
import type { ClientRow } from "@/components/dashboard/ClientsTable";
import type { PriorRow } from "@/components/dashboard/PriorMonthsTable";
import type { StageStatus } from "@/lib/types";
import { determineStatus, todayWIB, daysFromNowWIB, currentMonthYearWIB, formatMonthYearID, parsePeriodCookie } from "@/lib/utils/date";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  // Next.js 15: searchParams is a Promise — await it.
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the period: explicit URL param wins, then the session-remembered
  // period (cookie), then the current month in WIB.
  const saved = parsePeriodCookie(cookies().get("selectedPeriod")?.value);
  const { month: curMonth, year: curYear } = currentMonthYearWIB();

  const selectedMonth = parseInt(params?.month ?? "") || saved?.month || curMonth;
  const selectedYear = parseInt(params?.year ?? "") || saved?.year || curYear;

  // --- Batch 1: independent queries fired in parallel ---
  const [
    { data: clients },
    { data: templateRows },
    { data: selectedPeriods },
    { data: priorPeriods },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, pic_user_id")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("stage_templates")
      .select("client_id, task_type_id")
      .eq("is_active", true)
      .not("client_id", "is", null),
    supabase
      .from("client_periods")
      .select(
        "id, client_id, task_type_id, hard_deadline, period_stages(id, status, stage_name, order_index, internal_deadline, planned_date, completed_at, completed_by_user_id, notes)"
      )
      .eq("period_month", selectedMonth)
      .eq("period_year", selectedYear),
    supabase
      .from("client_periods")
      .select(
        "id, client_id, task_type_id, hard_deadline, period_month, period_year, period_stages(status)"
      )
      .or(
        `period_year.lt.${selectedYear},and(period_year.eq.${selectedYear},period_month.lt.${selectedMonth})`
      ),
  ]);

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

  // --- Derive unique client+task pairs and task type ids ---
  const seen = new Set<string>();
  const pairs: { clientId: string; taskTypeId: string }[] = [];
  for (const row of templateRows ?? []) {
    const key = `${row.client_id}-${row.task_type_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ clientId: row.client_id, taskTypeId: row.task_type_id });
  }

  const taskTypeIds = Array.from(new Set(pairs.map((p) => p.taskTypeId)));
  const picUserIds = Array.from(
    new Set((clients ?? []).map((c) => c.pic_user_id).filter(Boolean))
  ) as string[];

  // --- Process periods to find stage ids + completed-by user ids ---
  interface StageData {
    id: string;
    status: string;
    stage_name: string;
    order_index: number;
    internal_deadline: string | null;
    planned_date: string | null;
    completed_at: string | null;
    completed_by_user_id: string | null;
    notes: string | null;
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
    periodByClientTask.set(key, { id: p.id, hard_deadline: p.hard_deadline, stages });
  }

  const allStageIds = Array.from(periodByClientTask.values()).flatMap((p) =>
    p.stages.map((s) => s.id)
  );

  // --- Batch 2: dependent queries (need ids from batch 1) fired in parallel ---
  const [
    profilesResult,
    taskTypesResult,
    allTasksResult,
    completedByResult,
  ] = await Promise.all([
    picUserIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", picUserIds)
      : Promise.resolve({ data: [] }),
    taskTypeIds.length > 0
      ? supabase.from("task_types").select("id, name").in("id", taskTypeIds)
      : Promise.resolve({ data: [] }),
    allStageIds.length > 0
      ? supabase
          .from("stage_tasks")
          .select("id, stage_id, label, is_done")
          .in("stage_id", allStageIds)
          .order("order_index")
      : Promise.resolve({ data: [] }),
    allCompletedByIds.size > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(allCompletedByIds))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.full_name ?? ""])
  );

  // Display name of the signed-in user, for the "My clients" toggle. Falls
  // back to a direct lookup if they aren't a PIC (and thus not in profileMap).
  let currentUserName: string | null = null;
  if (user) {
    currentUserName = profileMap.get(user.id) || null;
    if (!currentUserName) {
      const { data: me } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      currentUserName = me?.full_name ?? null;
    }
  }

  const taskTypeMap = new Map(
    (taskTypesResult.data ?? []).map((t) => [t.id, t.name])
  );

  const stageTasksMap = new Map<
    string,
    { id: string; label: string; is_done: boolean }[]
  >();
  for (const task of allTasksResult.data ?? []) {
    const list = stageTasksMap.get(task.stage_id) ?? [];
    list.push({ id: task.id, label: task.label, is_done: task.is_done });
    stageTasksMap.set(task.stage_id, list);
  }

  const completedByNameMap = new Map(
    (completedByResult.data ?? []).map((p) => [p.id, p.full_name ?? ""])
  );

  // --- Date strings pinned to WIB (Asia/Jakarta) ---
  const todayStr = todayWIB();
  const weekStr = daysFromNowWIB(7);

  let totalActive = 0;
  let overdueCount = 0;
  let dueThisWeekCount = 0;
  let doneThisMonthCount = 0;
  let blockedCount = 0;

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
        ? determineStatus(stages, hardDeadline)
        : "no_period";
      const doneCount = stages.filter((s) => s.status === "done").length;

      if (status === "overdue") overdueCount++;
      if (status === "done") doneThisMonthCount++;
      if (status === "blocked") blockedCount++;

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
        stageId: s.id,
        stage_name: s.stage_name,
        status: s.status as StageStatus,
        internal_deadline: s.internal_deadline,
        planned_date: s.planned_date,
        completed_at: s.completed_at,
        completed_by_name: s.completed_by_user_id
          ? completedByNameMap.get(s.completed_by_user_id) ?? null
          : null,
        notes: s.notes,
        tasks: stageTasksMap.get(s.id) ?? [],
      }));

      const timelineStages = sortedStages.map((s) => ({
        status: s.status as StageStatus,
        stage_name: s.stage_name,
      }));

      const hasNotes = sortedStages.some(
        (s) => s.notes != null && s.notes.trim() !== ""
      );

      // Reason(s) on any blocked stage — surfaced on the dashboard so the
      // team can see *why* something is blocked without opening the period.
      const blockedReason =
        sortedStages
          .filter((s) => s.status === "blocked" && s.notes && s.notes.trim())
          .map((s) => s.notes!.trim())
          .join(" · ") || null;

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
        hasNotes,
        blockedReason,
      };
    })
    .filter(Boolean) as ClientRow[];

  clientRows.sort((a, b) => {
    const urgency: Record<string, number> = {
      blocked: 0,
      overdue: 1,
      in_progress: 2,
      not_started: 3,
      done: 4,
      no_period: 5,
    };
    const urgA = urgency[a.status] ?? 99;
    const urgB = urgency[b.status] ?? 99;
    if (urgA !== urgB) return urgA - urgB;
    if (a.clientName !== b.clientName)
      return a.clientName.localeCompare(b.clientName);
    return a.taskTypeName.localeCompare(b.taskTypeName);
  });

  // --- Prior unfinished ---
  let priorUnfinishedCount = 0;
  const priorRows: PriorRow[] = [];

  for (const pp of priorPeriods ?? []) {
    // Skip archived/deleted clients — clientMap only holds active clients.
    const client = clientMap.get(pp.client_id);
    if (!client) continue;

    const stages = pp.period_stages ?? [];
    const status = determineStatus(stages, pp.hard_deadline);

    if (
      status === "done" ||
      status === "not_started" ||
      status === "no_period"
    )
      continue;

    priorUnfinishedCount++;

    priorRows.push({
      clientId: pp.client_id,
      clientName: client?.name ?? "",
      taskTypeName: taskTypeMap.get(pp.task_type_id) ?? "",
      periodId: pp.id,
      periodMonth: pp.period_month,
      periodYear: pp.period_year,
      stageProgress: {
        done: stages.filter((s: { status: string }) => s.status === "done")
          .length,
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

  const isCurrentMonth = selectedMonth === curMonth && selectedYear === curYear;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <MonthSwitcher month={selectedMonth} year={selectedYear} />
        </div>
        <ExportButton month={selectedMonth} year={selectedYear} />
      </div>

      {!isCurrentMonth && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>
            Kamu sedang melihat <strong>{formatMonthYearID(selectedMonth, selectedYear)}</strong>,
            bukan bulan berjalan ({formatMonthYearID(curMonth, curYear)}).
            Semua perubahan di halaman ini berlaku untuk period bulan tersebut.
          </span>
        </div>
      )}

      <div className="mb-6">
        <MonthSummary
          month={selectedMonth}
          year={selectedYear}
          total={totalActive}
          done={doneThisMonthCount}
          overdue={overdueCount}
          blocked={blockedCount}
        />
      </div>

      <ClientsTable
        clients={clientRows}
        picOptions={uniquePicOptions}
        taskTypeOptions={taskTypeNames}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        totalActive={totalActive}
        overdue={overdueCount}
        dueThisWeek={dueThisWeekCount}
        doneThisMonth={doneThisMonthCount}
        priorUnfinished={priorUnfinishedCount}
        currentUserName={currentUserName}
        todayStr={todayStr}
        weekStr={weekStr}
      />

      <div id="prior-months">
        <PriorMonthsTable rows={priorRows} />
      </div>
    </div>
  );
}
