import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import type { StageStatus } from "@/lib/types";

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: stages } = await supabase
    .from("period_stages")
    .select(`
      id, stage_name, status, internal_deadline, order_index,
      period:period_id (
        id, period_month, period_year,
        client:client_id (id, name),
        task_type:task_type_id (name)
      )
    `)
    .eq("assignee_user_id", data.user.id)
    .neq("status", "done")
    .eq("period.period_month", month)
    .eq("period.period_year", year)
    .order("internal_deadline", { ascending: true, nullsFirst: false });

  const tasks = (stages ?? []).map((s) => {
    const period = s.period as unknown as Record<string, unknown>;
    return {
      id: s.id,
      stageName: s.stage_name,
      status: s.status as StageStatus,
      internalDeadline: s.internal_deadline as string | null,
      periodId: period?.id as string,
      clientId: (period?.client as Record<string, string>)?.id ?? "",
      clientName: (period?.client as Record<string, string>)?.name ?? "",
      taskTypeName: (period?.task_type as Record<string, string>)?.name ?? "",
    };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">My Tasks</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {tasks.length} pending task{tasks.length !== 1 ? "s" : ""} assigned to you this month
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Task Type</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50 ${
                  t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.status !== "done"
                    ? "border-l-2 border-l-red-500 bg-red-950/10"
                    : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-white">{t.clientName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {t.taskTypeName}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{t.stageName}</td>
                <td className="px-4 py-3 tabular-nums">
                  {t.internalDeadline ? (
                    <span className={new Date(t.internalDeadline) < new Date() && t.status !== "done" ? "text-red-400" : "text-zinc-400"}>
                      {new Date(t.internalDeadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${t.clientId}/${t.periodId}`}
                    className="rounded-md bg-white px-3 py-1 text-xs font-medium text-black hover:bg-zinc-200"
                  >
                    Buka
                  </Link>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No pending tasks. All done!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
