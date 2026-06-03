"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateStageDeadlineDay } from "@/lib/settings-actions";

interface StageTemplateData {
  id: string;
  stage_name: string;
  order_index: number;
  is_billable: boolean;
  is_active: boolean;
  default_deadline_day: number | null;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
    >
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
          className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-pointer text-sm ${
            stage.is_active ? "text-zinc-300" : "text-zinc-600 line-through"
          }`}
        >
          {stage.stage_name}
        </span>
      )}

      <label className="flex items-center gap-1 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={stage.is_billable}
          onChange={(e) => onToggleBillable(stage.id, e.target.checked)}
          className="h-3 w-3 rounded border-zinc-600 bg-zinc-700 accent-white"
        />
        Billable
      </label>

      <label className="flex items-center gap-1 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={stage.is_active}
          onChange={(e) => onToggleActive(stage.id, e.target.checked)}
          className="h-3 w-3 rounded border-zinc-600 bg-zinc-700 accent-white"
        />
        Active
      </label>

      <input
        type="number"
        min={1}
        max={31}
        value={deadlineVal}
        onChange={(e) => handleDeadlineChange(e.target.value)}
        placeholder="D"
        className="w-10 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-xs text-white text-center focus:border-zinc-500 focus:outline-none"
        title="Deadline day"
      />

      <button
        onClick={() => onDelete(stage.id)}
        className="rounded p-0.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4l6 6M10 4l-6 6" />
        </svg>
      </button>
    </div>
  );
}
