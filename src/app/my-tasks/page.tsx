import { createClient } from "@/lib/supabase/server";
import MyTasksClient, { type MyTask } from "@/components/my-tasks/MyTasksClient";
import type { StageStatus } from "@/lib/types";

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;

  // Fetch all stages assigned to the user across every month/year (including
  // done). Filtering, grouping, and pagination happen client-side.
  const { data: stages } = await supabase
    .from("period_stages")
    .select(`
      id, stage_name, status, internal_deadline, order_index,
      period:period_id (
        id, period_month, period_year,
        client:client_id (id, name, is_active),
        task_type:task_type_id (name)
      )
    `)
    .eq("assignee_user_id", data.user.id)
    .order("internal_deadline", { ascending: true, nullsFirst: false });

  const tasks: MyTask[] = (stages ?? [])
    .map((s) => {
      const period = s.period as unknown as Record<string, unknown>;
      const client = period?.client as Record<string, unknown> | undefined;
      return {
        id: s.id,
        stageName: s.stage_name,
        status: s.status as StageStatus,
        internalDeadline: s.internal_deadline as string | null,
        periodId: (period?.id as string) ?? "",
        periodMonth: (period?.period_month as number) ?? 0,
        periodYear: (period?.period_year as number) ?? 0,
        clientId: (client?.id as string) ?? "",
        clientName: (client?.name as string) ?? "",
        clientActive: client?.is_active as boolean | undefined,
        taskTypeName: (period?.task_type as Record<string, string>)?.name ?? "",
      };
    })
    // Exclude tasks whose client was archived/deleted, and any rows whose
    // period join came back null.
    .filter((t) => t.periodId && t.clientActive !== false);

  return <MyTasksClient tasks={tasks} />;
}
