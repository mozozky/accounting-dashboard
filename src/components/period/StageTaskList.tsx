"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  addStageTask,
  toggleStageTask,
  deleteStageTask,
} from "@/lib/period-actions";

interface TaskItem {
  id: string;
  label: string;
  is_done: boolean;
  order_index: number;
}

interface Props {
  stageId: string;
  tasks: TaskItem[];
}

export default function StageTaskList({ stageId, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  // Track which task ids are currently being toggled / deleted
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    const result = await addStageTask(stageId, label);
    setAdding(false);
    if (result.error) {
      toast.error(`Gagal menambah task: ${result.error}`);
    } else {
      setNewLabel("");
    }
  };

  const handleToggle = async (taskId: string, currentDone: boolean) => {
    // Mark as toggling + optimistic UI
    setTogglingIds((s) => new Set(s).add(taskId));
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_done: !currentDone } : t))
    );

    const result = await toggleStageTask(taskId, !currentDone);

    setTogglingIds((s) => {
      const next = new Set(s);
      next.delete(taskId);
      return next;
    });

    if (result?.error) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_done: currentDone } : t))
      );
      toast.error(`Gagal mengubah task: ${result.error}`);
    }
  };

  const handleDelete = async (taskId: string) => {
    const snapshot = tasks;
    // Mark as deleting + optimistic UI
    setDeletingIds((s) => new Set(s).add(taskId));
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const result = await deleteStageTask(taskId);

    setDeletingIds((s) => {
      const next = new Set(s);
      next.delete(taskId);
      return next;
    });

    if (result?.error) {
      setTasks(snapshot);
      toast.error(`Gagal menghapus task: ${result.error}`);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">CHECKLIST</p>
      <div className="space-y-1">
        {tasks.map((task) => {
          const isToggling = togglingIds.has(task.id);
          const isDeleting = deletingIds.has(task.id);

          return (
            <div
              key={task.id}
              className={`group flex items-center gap-2 transition-opacity ${isDeleting ? "opacity-40" : ""}`}
            >
              {/* Checkbox / spinner */}
              <div className="relative h-3.5 w-3.5 shrink-0">
                {isToggling ? (
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-zinc-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <input
                    type="checkbox"
                    checked={task.is_done}
                    onChange={() => handleToggle(task.id, task.is_done)}
                    disabled={isToggling || isDeleting}
                    className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 text-white accent-white disabled:cursor-not-allowed"
                  />
                )}
              </div>

              <span
                className={`flex-1 text-sm ${
                  task.is_done ? "text-zinc-500 line-through" : "text-zinc-300"
                }`}
              >
                {task.label}
              </span>

              {/* Delete button — hidden unless hovering, disabled while any op in flight */}
              {!isDeleting && !isToggling && (
                <button
                  onClick={() => handleDelete(task.id)}
                  className="hidden text-xs text-zinc-600 hover:text-red-400 group-hover:inline"
                >
                  del
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add task..."
          disabled={adding}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newLabel.trim()}
          className="flex items-center gap-1.5 rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-40"
        >
          {adding ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Adding...
            </>
          ) : (
            "Add"
          )}
        </button>
      </div>
    </div>
  );
}
