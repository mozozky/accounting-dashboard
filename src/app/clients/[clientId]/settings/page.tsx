import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StageTemplateEditor from "@/components/settings/StageTemplateEditor";
import AssignTaskTypePanel from "@/components/settings/AssignTaskTypePanel";
import { SettingsForm } from "./SettingsForm";

export default async function ClientSettingsPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { new?: string };
}) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.clientId)
    .single();

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Client not found</p>
      </div>
    );
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  const { data: taskTypeRows } = await supabase
    .from("stage_templates")
    .select("task_type_id")
    .eq("client_id", params.clientId)
    .eq("is_active", true);

  const { data: customTaskTypes } = await supabase
    .from("task_types")
    .select("id, name")
    .eq("client_id", params.clientId);

  const assignedBuiltinIds = Array.from(
    new Set((taskTypeRows ?? []).map((r) => r.task_type_id))
  );

  const customIds = (customTaskTypes ?? []).map((t) => t.id);
  const assignedIds = Array.from(new Set([...assignedBuiltinIds, ...customIds]));

  let allAssignedTaskTypes: { id: string; name: string }[] = [];

  if (assignedIds.length > 0) {
    const { data: taskTypesById } = await supabase
      .from("task_types")
      .select("id, name")
      .in("id", assignedIds)
      .order("name");

    allAssignedTaskTypes = taskTypesById ?? [];
  }

  const { data: builtInTaskTypes } = await supabase
    .from("task_types")
    .select("id, name")
    .eq("is_builtin", true)
    .is("client_id", null)
    .order("name");

  const availableTaskTypes = (builtInTaskTypes ?? []).filter(
    (t) => !assignedIds.includes(t.id)
  );

  const taskTypeStageMap = new Map<
    string,
    {
      taskTypeName: string;
      defaultDeadlineDay: number | null;
      stages: {
        id: string;
        stage_name: string;
        order_index: number;
        is_billable: boolean;
        is_active: boolean;
      }[];
    }
  >();

  if (assignedIds.length > 0) {
    const { data: allStages } = await supabase
      .from("stage_templates")
      .select("*")
      .eq("client_id", params.clientId)
      .in("task_type_id", assignedIds)
      .order("order_index");

    for (const tt of allAssignedTaskTypes ?? []) {
      const ttStages = (allStages ?? []).filter((s) => s.task_type_id === tt.id);
      taskTypeStageMap.set(tt.id, {
        taskTypeName: tt.name,
        defaultDeadlineDay: ttStages[0]?.default_deadline_day ?? null,
        stages: ttStages.map((s) => ({
          id: s.id,
          stage_name: s.stage_name,
          order_index: s.order_index,
          is_billable: s.is_billable,
          is_active: s.is_active,
        })),
      });
    }
  }

  return (
    <div className="p-8">
      <Link
        href={`/clients/${params.clientId}`}
        className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300"
      >
        &larr; Back to Client
      </Link>

      <h1 className="mb-8 text-lg font-semibold text-white">
        Settings — {client.name}
      </h1>

      {searchParams.new === "1" && (
        <div className="mb-6 rounded-md border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-400">
          Klien berhasil dibuat. Assign task type di bawah untuk mulai
          tracking pekerjaan.
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Client Info
        </h2>
        <SettingsForm
          client={client}
          profiles={(profiles ?? []) as { id: string; full_name: string | null }[]}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Task Types
        </h2>
        <AssignTaskTypePanel
          clientId={params.clientId}
          assigned={(allAssignedTaskTypes ?? []) as { id: string; name: string }[]}
          available={availableTaskTypes}
        />
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium text-zinc-300">
          Stage Templates
        </h2>
        <div className="space-y-4">
          {Array.from(taskTypeStageMap.entries()).map(
            ([taskTypeId, { taskTypeName, stages, defaultDeadlineDay }]) => (
              <StageTemplateEditor
                key={taskTypeId}
                clientId={params.clientId}
                taskTypeName={taskTypeName}
                taskTypeId={taskTypeId}
                stages={stages}
                defaultDeadlineDay={defaultDeadlineDay}
              />
            )
          )}
          {taskTypeStageMap.size === 0 && (
            <p className="text-sm text-zinc-500">
              No task types assigned. Use the panel above to assign or create task types.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
