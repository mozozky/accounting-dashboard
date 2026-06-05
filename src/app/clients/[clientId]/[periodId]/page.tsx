import { createClient } from "@/lib/supabase/server";
import PeriodDetailClient from "@/components/period/PeriodDetailClient";
import Link from "next/link";
import type { StageTask } from "@/lib/types";

export default async function PeriodDetailPage({
  params,
}: {
  params: { clientId: string; periodId: string };
}) {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("client_periods")
    .select(
      "id, client_id, task_type_id, hard_deadline, period_month, period_year, task_type:task_types(id, name), client:clients(name)"
    )
    .eq("id", params.periodId)
    .single();

  if (!period) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Period not found</p>
      </div>
    );
  }

  const [stagesResult, teamResult] = await Promise.all([
    supabase
      .from("period_stages")
      .select("*")
      .eq("period_id", params.periodId)
      .order("order_index"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name"),
  ]);

  const stages = stagesResult.data ?? [];
  const teamMembers = teamResult.data ?? [];

  const { data: allTasks } = await supabase
    .from("stage_tasks")
    .select("*")
    .in(
      "stage_id",
      stages.map((s) => s.id)
    )
    .order("order_index");

  const stageTasks: Record<string, StageTask[]> = {};
  for (const task of allTasks ?? []) {
    if (!stageTasks[task.stage_id]) stageTasks[task.stage_id] = [];
    stageTasks[task.stage_id].push(task);
  }

  const taskType = Array.isArray(period.task_type)
    ? period.task_type[0]
    : period.task_type;
  const client = Array.isArray(period.client)
    ? period.client[0]
    : period.client;

  return (
    <div className="p-8">
      <Link
        href={`/clients/${params.clientId}`}
        className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300"
      >
        &larr; Back
      </Link>

      <PeriodDetailClient
        periodId={period.id}
        stages={stages}
        stageTasks={stageTasks}
        hardDeadline={period.hard_deadline}
        teamMembers={teamMembers}
        clientName={client?.name ?? ""}
        taskTypeName={taskType?.name ?? ""}
        periodMonth={period.period_month}
        periodYear={period.period_year}
      />
    </div>
  );
}
