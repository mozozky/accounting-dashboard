import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { StageStatus } from "@/lib/types";
import MonthSwitcher from "@/components/dashboard/MonthSwitcher";

function getStageColor(status: StageStatus): string {
  switch (status) {
    case "done": return "bg-emerald-500";
    case "in_progress": return "bg-amber-500";
    case "blocked": return "bg-red-500";
    case "not_started": return "bg-zinc-600";
  }
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { month?: string; year?: string };
}) {
  const supabase = await createClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const month = parseInt(searchParams?.month ?? "") || currentMonth;
  const year = parseInt(searchParams?.year ?? "") || currentYear;
  const clampedMonth = Math.max(1, Math.min(12, month));

  const { data: client } = await supabase
    .from("clients")
    .select("*, profiles:pic_user_id(id, full_name, email)")
    .eq("id", params.clientId)
    .single();

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Client not found</p>
      </div>
    );
  }

  const { data: assignedTaskTypeIds } = await supabase
    .from("stage_templates")
    .select("task_type_id")
    .eq("client_id", params.clientId)
    .eq("is_active", true);

  const taskTypeIds = Array.from(
    new Set((assignedTaskTypeIds ?? []).map((r) => r.task_type_id))
  );

  let taskTypeMap = new Map<string, { id: string; name: string }>();
  if (taskTypeIds.length > 0) {
    const { data: taskTypes } = await supabase
      .from("task_types")
      .select("id, name")
      .in("id", taskTypeIds);
    taskTypeMap = new Map(
      (taskTypes ?? []).map((t) => [t.id, { id: t.id, name: t.name }])
    );
  }

  const { data: periods } = await supabase
    .from("client_periods")
    .select("id, task_type_id, hard_deadline, period_stages(id, status, stage_name, order_index)")
    .eq("client_id", params.clientId)
    .eq("period_month", clampedMonth)
    .eq("period_year", year);

  const periodByTaskType = new Map(
    (periods ?? []).map((p) => [p.task_type_id, p])
  );

  const pic = client.profiles as { id: string; full_name: string | null; email: string | null } | null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/clients"
          className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300"
        >
          &larr; Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{client.name}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
              <span>PIC: {pic?.full_name ?? "Unassigned"}</span>
              {client.contact_email && <span>{client.contact_email}</span>}
              {client.contact_phone && <span>{client.contact_phone}</span>}
            </div>
          </div>
          <Link
            href={`/clients/${params.clientId}/settings`}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">
          {new Date(year, clampedMonth - 1).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <MonthSwitcher
          month={clampedMonth}
          year={year}
          baseUrl={`/clients/${params.clientId}`}
        />
      </div>

      <div className="space-y-3">
        {Array.from(taskTypeMap.values()).map((taskType) => {
          const period = periodByTaskType.get(taskType.id);
          const stages = period?.period_stages ?? [];
          const done = stages.filter(
            (s: { status: string }) => s.status === "done"
          ).length;

          return (
            <div
              key={taskType.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">
                  {taskType.name}
                </h3>
                {period ? (
                  <span className="text-xs text-zinc-500">
                    {done}/{stages.length} done
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">No period</span>
                )}
              </div>

              {stages.length > 0 && (
                <div className="mb-4 flex items-center gap-1">
                  {stages
                    .sort(
                      (a: { order_index: number }, b: { order_index: number }) =>
                        a.order_index - b.order_index
                    )
                    .map(
                      (
                        stage: {
                          id: string;
                          status: StageStatus;
                          stage_name: string;
                          order_index: number;
                        },
                        i: number
                      ) => (
                        <div key={stage.id} className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${getStageColor(stage.status)}`}
                            title={`${stage.stage_name}: ${stage.status}`}
                          />
                          {i < stages.length - 1 && (
                            <div className="h-px w-4 bg-zinc-700" />
                          )}
                        </div>
                      )
                    )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {period && (
                  <Link
                    href={`/clients/${params.clientId}/${period.id}`}
                    className="rounded-md bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-zinc-200"
                  >
                    Buka Period
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {taskTypeMap.size === 0 && (
          <p className="text-sm text-zinc-500">
            No task types assigned to this client yet.
          </p>
        )}
      </div>
    </div>
  );
}
