"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  updateStageDeadlineDay,
  updateStagePlannedDateDay,
  updateStageDefaultAssignee,
  addTaskTemplate,
  deleteTaskTemplate,
} from "@/lib/settings-actions";

interface TaskTemplate {
  id: string;
  label: string;
  order_index: number;
}

interface StageTemplateData {
  id: string;
  stage_name: string;
  order_index: number;
  is_billable: boolean;
  is_active: boolean;
  default_deadline_day: number | null;
  planned_date_day: number | null;
  default_assignee_type: "pic" | "none";
}

interface Props {
  stage: StageTemplateData;
  onChangeName: (id: string, name: string) => void;
  onToggleBillable: (id: string, value: boolean) => void;
  onToggleActive: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
}

export default function StageTemplateRow({
  stage,
  onChangeName,
  onToggleBillable,
  onToggleActive,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stage.stage_name);
  const [deadlineVal, setDeadlineVal] = useState(
    stage.default_deadline_day ? String(stage.default_deadline_day) : ""
  );
  const [plannedDateVal, setPlannedDateVal] = useState(
    stage.planned_date_day ? String(stage.planned_date_day) : ""
  );
  const [assigneeType, setAssigneeType] = useState<"pic" | "none">(
    stage.default_assignee_type ?? "pic"
  );
  const [showTasks, setShowTasks] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);

  const supabase = createClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (!showTasks) return;
    supabase
      .from("stage_task_templates")
      .select("id, label, order_index")
      .eq("template_id", stage.id)
      .order("order_index")
      .then(({ data }) => setTaskTemplates((data as TaskTemplate[]) ?? []));
  }, [showTasks, stage.id, supabase]);

  const handleSave = () => {
    if (draft.trim()) {
      onChangeName(stage.id, draft.trim());
    } else {
      setDraft(stage.stage_name);
    }
    setEditing(false);
  };

  const handleDeadlineChange = (value: string) => {
    setDeadlineVal(value);
    const num = value ? parseInt(value) : null;
    if (num && (num < 1 || num > 31)) return;
    updateStageDeadlineDay(stage.id, num);
  };

  const handlePlannedDateChange = (value: string) => {
    setPlannedDateVal(value);
    const num = value ? parseInt(value) : null;
    if (num && (num < 1 || num > 31)) return;
    updateStagePlannedDateDay(stage.id, num);
  };

  const handleAssigneeTypeChange = (type: "pic" | "none") => {
    setAssigneeType(type);
    updateStageDefaultAssignee(stage.id, type);
  };

  const handleAddTask = async () => {
    if (!taskLabel.trim()) return;
    setTaskLoading(true);
    const result = await addTaskTemplate(stage.id, taskLabel.trim());
    setTaskLoading(false);
    if (result.success && result.task) {
      setTaskTemplates((prev) => [...prev, result.task! as TaskTemplate]);
      setTaskLabel("");
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTaskTemplates((prev) => prev.filter((t) => t.id !== id));
    await deleteTaskTemplate(id);
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 flex-wrap"
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="2" r="1" />
            <circle cx="9" cy="2" r="1" />
            <circle cx="3" cy="6" r="1" />
            <circle cx="9" cy="6" r="1" />
            <circle cx="3" cy="10" r="1" />
            <circle cx="9" cy="10" r="1" />
          </svg>
        </button>

        <span className="text-xs font-medium text-zinc-600 tabular-nums w-5">
          {stage.order_index + 1}
        </span>

        {/* Stage name */}
        {editing ? (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setDraft(stage.stage_name);
                setEditing(false);
              }
            }}
            autoFocus
            className="flex-1 min-w-[100px] rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={`flex-1 min-w-[100px] cursor-pointer text-sm ${
              stage.is_active ? "text-zinc-300" : "text-zinc-600 line-through"
            }`}
          >
            {stage.stage_name}
          </span>
        )}

        {/* Billable */}
        <label className="flex items-center gap-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={stage.is_billable}
            onChange={(e) => onToggleBillable(stage.id, e.target.checked)}
            className="h-3 w-3 rounded border-zinc-600 bg-zinc-700 accent-white"
          />
          Billable
        </label>

        {/* Active */}
        <label className="flex items-center gap-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={stage.is_active}
            onChange={(e) => onToggleActive(stage.id, e.target.checked)}
            className="h-3 w-3 rounded border-zinc-600 bg-zinc-700 accent-white"
          />
          Active
        </label>

        {/* Internal deadline day */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-600" title="Internal deadline day">
            DL
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={deadlineVal}
            onChange={(e) => handleDeadlineChange(e.target.value)}
            placeholder="-"
            className="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-xs text-white text-center focus:border-zinc-500 focus:outline-none"
            title="Internal deadline day (1–31 of next month)"
          />
        </div>

        {/* Planned date day (review target) */}
        <div className="flex items-center gap-1">
          <span
            className="text-xs text-violet-400/70"
            title="Planned date day (review target)"
          >
            PL
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={plannedDateVal}
            onChange={(e) => handlePlannedDateChange(e.target.value)}
            placeholder="-"
            className="w-10 rounded border border-violet-800/50 bg-zinc-800 px-1 py-0.5 text-xs text-violet-300 text-center focus:border-violet-500 focus:outline-none"
            title="Planned date day — review target for manager (1–31 of next month)"
          />
        </div>

        {/* Default assignee type toggle */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-600">Assign:</span>
          <button
            onClick={() =>
              handleAssigneeTypeChange(
                assigneeType === "pic" ? "none" : "pic"
              )
            }
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              assigneeType === "pic"
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
            }`}
            title={
              assigneeType === "pic"
                ? "Auto-assign to Client PIC — click to set None"
                : "No default assignee — click to set PIC"
            }
          >
            {assigneeType === "pic" ? "PIC" : "None"}
          </button>
        </div>

        {/* Task templates toggle */}
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title="Task templates"
        >
          {showTasks ? "−" : "+"} Tasks
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(stage.id)}
          className="rounded p-0.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 4l6 6M10 4l-6 6" />
          </svg>
        </button>
      </div>

      {showTasks && (
        <div className="ml-8 mt-1 space-y-1 rounded-md border border-zinc-700/50 bg-zinc-900/30 px-3 py-2">
          <p className="text-xs font-medium text-zinc-500 mb-2">
            Recurring Tasks (auto-copied each period)
          </p>
          {taskTemplates.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 flex-1">{t.label}</span>
              <button
                onClick={() => handleDeleteTask(t.id)}
                className="rounded p-0.5 text-zinc-600 hover:text-red-400"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 3l4 4M7 3l-4 4" />
                </svg>
              </button>
            </div>
          ))}
          {taskTemplates.length === 0 && (
            <p className="text-xs text-zinc-600">No recurring tasks set</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
              }}
              placeholder="Add task..."
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <button
              onClick={handleAddTask}
              disabled={taskLoading || !taskLabel.trim()}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-white hover:bg-zinc-600 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
