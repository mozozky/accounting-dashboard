"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignTaskTypeToClientAction } from "@/lib/actions";
import { createCustomTaskType } from "@/lib/settings-actions";

interface TaskTypeInfo {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  assigned: TaskTypeInfo[];
  available: TaskTypeInfo[];
}

export default function AssignTaskTypePanel({
  clientId,
  assigned: propsAssigned,
  available: propsAvailable,
}: Props) {
  const router = useRouter();
  const [localAssigned, setLocalAssigned] = useState(propsAssigned);
  const [localAvailable, setLocalAvailable] = useState(propsAvailable);
  const [loading, setLoading] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    setLocalAssigned(propsAssigned);
  }, [propsAssigned]);

  useEffect(() => {
    setLocalAvailable(propsAvailable);
  }, [propsAvailable]);

  const handleAssign = async (taskTypeId: string) => {
    const item = localAvailable.find((t) => t.id === taskTypeId);
    if (!item) return;

    setLoading(taskTypeId);
    setLocalAssigned((prev) => [...prev, item]);
    setLocalAvailable((prev) => prev.filter((t) => t.id !== taskTypeId));

    const result = await assignTaskTypeToClientAction(clientId, taskTypeId);
    setLoading(null);

    if (result.error) {
      setLocalAssigned((prev) => prev.filter((t) => t.id !== taskTypeId));
      setLocalAvailable((prev) => [...prev, item]);
      toast.error(result.error);
    } else {
      setNeedsRefresh(true);
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    const name = customName.trim();
    setCreating(true);
    setCustomName("");

    const result = await createCustomTaskType(clientId, name);
    setCreating(false);

    if (result.success && result.taskType) {
      setLocalAssigned((prev) => [
        ...prev,
        { id: result.taskType!.id, name: result.taskType!.name },
      ]);
      setNeedsRefresh(true);
    } else if (result.error) {
      toast.error(result.error);
      setCustomName(name);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-300">
        Task Types Assigned
      </h3>

      <div className="mb-4 space-y-1">
        {localAssigned.map((tt) => (
          <div
            key={tt.id}
            className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-white">{tt.name}</span>
            </div>
            <span className="text-xs text-zinc-600">Assigned</span>
          </div>
        ))}
        {localAssigned.length === 0 && (
          <p className="py-2 text-xs text-zinc-600">
            No task types assigned yet.
          </p>
        )}
      </div>

      {localAvailable.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 border-t border-zinc-800" />
            <span className="text-xs text-zinc-600">Available to Assign</span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>

          <div className="mb-4 space-y-1">
            {localAvailable.map((tt) => (
              <div
                key={tt.id}
                className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-600" />
                  <span className="text-sm text-zinc-400">{tt.name}</span>
                </div>
                <button
                  onClick={() => handleAssign(tt.id)}
                  disabled={loading === tt.id}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {loading === tt.id ? "..." : "+ Assign"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-zinc-800" />
        <span className="text-xs text-zinc-600">Custom</span>
        <div className="flex-1 border-t border-zinc-800" />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateCustom();
          }}
          placeholder="New task type name..."
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <button
          onClick={handleCreateCustom}
          disabled={creating || !customName.trim()}
          className="rounded bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          {creating ? "..." : "+ Create"}
        </button>
      </div>

      {needsRefresh && (
        <div className="mt-4 flex items-center justify-between rounded border border-amber-800 bg-amber-950/30 px-3 py-2">
          <span className="text-xs text-amber-400">
            Changes saved. Refresh to edit stages.
          </span>
          <button
            onClick={() => router.refresh()}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
