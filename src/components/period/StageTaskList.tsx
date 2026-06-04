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
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_done: !currentDone } : t))
    );
    const result = await toggleStageTask(taskId, !currentDone);
    if (result?.error) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_done: currentDone } : t))
      );
      toast.error(`Gagal mengubah task: ${result.error}`);
    }
  };

  const handleDelete = async (taskId: string) => {
    // Optimistic update
    const snapshot = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const result = await deleteStageTask(taskId);
    if (result?.error) {
      // Rollback
      setTasks(snapshot);
      toast.error(`Gagal menghapus task: ${result.error}`);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">CHECKLIST</p>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div key={task.id} className="group flex items-center gap-2">
            <input
              type="checkbox"
              checked={task.is_done}
              onChange={() => handleToggle(task.id, task.is_done)}
              className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 text-white accent-white"
            />
            <span
              className={`flex-1 text-sm ${
                task.is_done ? "text-zinc-500 line-through" : "text-zinc-300"
              }`}
            >
              {task.label}
            </span>
            <button
              onClick={() => handleDelete(task.id)}
              className="hidden text-xs text-zinc-600 hover:text-red-400 group-hover:inline"
            >
              del
            </button>
          </div>
        ))}
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
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newLabel.trim()}
          className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
