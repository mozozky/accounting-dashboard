"use client";

import { useState, useRef, useEffect } from "react";
import StageTaskList from "./StageTaskList";
import type { StageTask, StageStatus } from "@/lib/types";

interface Props {
  stage: {
    id: string;
    stage_name: string;
    order_index: number;
    status: StageStatus;
    internal_deadline: string | null;
    assignee_user_id: string | null;
    notes: string | null;
  };
  tasks: StageTask[];
  teamMembers: { id: string; full_name: string | null }[];
  onChangeStatus: (stageId: string, status: StageStatus) => void;
  onChangeDeadline: (stageId: string, deadline: string | null) => void;
  onChangeAssignee: (stageId: string, userId: string | null) => void;
  onChangeNotes: (stageId: string, notes: string | null) => void;
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const STATUS_COLORS: Record<StageStatus, string> = {
  not_started: "border-zinc-600 bg-zinc-800 text-zinc-400",
  in_progress: "border-amber-600 bg-amber-950/30 text-amber-400",
  done: "border-emerald-600 bg-emerald-950/30 text-emerald-400",
  blocked: "border-red-600 bg-red-950/30 text-red-400",
};

const BADGE_COLORS: Record<StageStatus, string> = {
  not_started: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-amber-500 text-black",
  done: "bg-emerald-500 text-white",
  blocked: "bg-red-600 text-white",
};

export default function StageCard({
  stage,
  tasks,
  teamMembers,
  onChangeStatus,
  onChangeDeadline,
  onChangeAssignee,
  onChangeNotes,
}: Props) {
  const [notesDraft, setNotesDraft] = useState(stage.notes ?? "");
  const [deadlineDraft, setDeadlineDraft] = useState(
    stage.internal_deadline ?? ""
  );
  const [statusWarning, setStatusWarning] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const deadlineTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNotesDraft(stage.notes ?? "");
    setDeadlineDraft(stage.internal_deadline ?? "");
    setStatusWarning(stage.status === "blocked" && !stage.notes?.trim());
  }, [stage.notes, stage.internal_deadline, stage.status]);

  const handleStatusChange = (newStatus: StageStatus) => {
    if (newStatus === stage.status) return;

    if (newStatus === "blocked" && !notesDraft.trim()) {
      setStatusWarning(true);
      setTimeout(() => notesRef.current?.focus(), 100);
    } else {
      setStatusWarning(false);
    }

    onChangeStatus(stage.id, newStatus);
  };

  const handleNotesChange = (value: string) => {
    setNotesDraft(value);
    if (value.trim()) setStatusWarning(false);

    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onChangeNotes(stage.id, value || null);
    }, 800);
  };

  const handleDeadlineChange = (value: string) => {
    setDeadlineDraft(value);

    if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
    deadlineTimerRef.current = setTimeout(() => {
      onChangeDeadline(stage.id, value || null);
    }, 800);
  };

  const isBlockedWithoutNotes = stage.status === "blocked" && !notesDraft.trim();

  return (
    <div
      className={`rounded-lg border ${STATUS_COLORS[stage.status]} p-4 transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            Stage {stage.order_index + 1}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-white">
            {stage.stage_name}
          </h3>
          <span
            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${BADGE_COLORS[stage.status]}`}
          >
            {STATUS_OPTIONS.find((o) => o.value === stage.status)?.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stage.status}
            onChange={(e) => handleStatusChange(e.target.value as StageStatus)}
            className={`rounded border px-2 py-1 text-xs focus:outline-none ${STATUS_COLORS[stage.status]}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-800 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusWarning && (
        <div className="mt-3 rounded border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          Catatan wajib diisi untuk status Blocked.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Internal Deadline
          </label>
          <input
            type="date"
            value={deadlineDraft}
            onChange={(e) => handleDeadlineChange(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Assignee
          </label>
          <select
            value={stage.assignee_user_id ?? ""}
            onChange={(e) =>
              onChangeAssignee(stage.id, e.target.value || null)
            }
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="" className="bg-zinc-800">
              Unassigned
            </option>
            {teamMembers.map((m) => (
              <option
                key={m.id}
                value={m.id}
                className="bg-zinc-800"
              >
                {m.full_name ?? m.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-zinc-500">
          Notes
        </label>
        <textarea
          ref={notesRef}
          value={notesDraft}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={2}
          className={`w-full rounded border px-2 py-1 text-xs text-white focus:outline-none ${
            isBlockedWithoutNotes
              ? "border-red-700 bg-zinc-800"
              : "border-zinc-700 bg-zinc-800 focus:border-zinc-500"
          }`}
          placeholder="Add notes..."
        />
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <StageTaskList stageId={stage.id} tasks={tasks} />
      </div>
    </div>
  );
}
