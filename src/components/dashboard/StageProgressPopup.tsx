"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { updateStageStatus, toggleStageTask } from "@/lib/period-actions";
import type { StageStatus } from "@/lib/types";

export interface StagePopupItem {
  stageId: string;
  stage_name: string;
  status: StageStatus;
  completed_at: string | null;
  completed_by_name: string | null;
  tasks: { id: string; label: string; is_done: boolean }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientName: string;
  taskTypeName: string;
  stages: StagePopupItem[];
}

const STAGE_COLORS: Record<StageStatus, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-amber-500",
  blocked: "bg-red-500",
  not_started: "bg-zinc-600",
};

const NEXT_STATUS: Record<StageStatus, StageStatus> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
  blocked: "in_progress",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export default function StageProgressPopup({
  open,
  onClose,
  clientName,
  taskTypeName,
  stages: initialStages,
}: Props) {
  const [stages, setStages] = useState(initialStages);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleCycleStatus = async (stageId: string) => {
    const current = stages.find((s) => s.stageId === stageId);
    if (!current) return;
    const next = NEXT_STATUS[current.status];

    setStages((prev) =>
      prev.map((s) =>
        s.stageId === stageId
          ? { ...s, status: next, completed_at: next === "done" ? new Date().toISOString() : s.completed_at }
          : s
      )
    );

    const result = await updateStageStatus(stageId, next);
    if (result.error) toast.error(result.error);
  };

  const handleToggleTask = async (taskId: string, isDone: boolean) => {
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, is_done: isDone } : t
        ),
      }))
    );

    await toggleStageTask(taskId, isDone);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">{clientName}</h3>
            <p className="text-xs text-zinc-500">{taskTypeName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {stages.map((stage) => {
            const isExpanded = expanded === stage.stageId;
            const doneTasks = stage.tasks.filter((t) => t.is_done).length;
            const totalTasks = stage.tasks.length;

            return (
              <div key={stage.stageId} className="border-b border-zinc-800/50 last:border-b-0">
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => handleCycleStatus(stage.stageId)}
                    className={`h-3 w-3 shrink-0 rounded-full ${STAGE_COLORS[stage.status]} cursor-pointer transition-transform hover:scale-125`}
                    title={`${STATUS_LABEL[stage.status]} — click to advance`}
                  />

                  <button
                    onClick={() =>
                      setExpanded(isExpanded ? null : stage.stageId)
                    }
                    className="flex-1 text-left text-sm text-white hover:text-zinc-300"
                  >
                    {stage.stage_name}
                    {totalTasks > 0 && (
                      <span className="ml-2 text-xs text-zinc-500">
                        {doneTasks}/{totalTasks}
                      </span>
                    )}
                  </button>

                  <span className="text-xs text-zinc-500">
                    {STATUS_LABEL[stage.status]}
                  </span>
                </div>

                {isExpanded && stage.tasks.length > 0 && (
                  <div className="mb-2 ml-6 space-y-1">
                    {stage.tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-zinc-800/50"
                      >
                        <input
                          type="checkbox"
                          checked={task.is_done}
                          onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 accent-white shrink-0"
                        />
                        <span
                          className={`text-xs ${
                            task.is_done ? "text-zinc-500 line-through" : "text-zinc-300"
                          }`}
                        >
                          {task.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {isExpanded && stage.tasks.length === 0 && (
                  <p className="mb-2 ml-6 text-xs text-zinc-600">
                    No tasks in checklist
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-800 px-5 py-3 text-right shrink-0">
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-800 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
