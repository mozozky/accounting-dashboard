"use client";

import { useState, useCallback, useRef } from "react";
import StageCard from "./StageCard";
import SavingIndicator from "./SavingIndicator";
import {
  updateStageStatus,
  updateStageDeadline,
  updateStageAssignee,
  updateStageNotes,
  updatePeriodDeadline,
} from "@/lib/period-actions";
import type { StageStatus, StageTask } from "@/lib/types";

interface StageData {
  id: string;
  stage_name: string;
  order_index: number;
  status: StageStatus;
  internal_deadline: string | null;
  assignee_user_id: string | null;
  notes: string | null;
}

interface Props {
  periodId: string;
  stages: StageData[];
  stageTasks: Record<string, StageTask[]>;
  hardDeadline: string | null;
  teamMembers: { id: string; full_name: string | null }[];
  clientName: string;
  taskTypeName: string;
}

export default function PeriodDetailClient({
  periodId,
  stages: initialStages,
  stageTasks,
  hardDeadline: initialDeadline,
  teamMembers,
  clientName,
  taskTypeName,
}: Props) {
  const [stages, setStages] = useState(initialStages);
  const [saving, setSaving] = useState(false);
  const deadlineTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [deadlineDraft, setDeadlineDraft] = useState(initialDeadline ?? "");

  const trackSaving = useCallback(async (fn: () => Promise<unknown>) => {
    setSaving(true);
    await fn();
    setSaving(false);
  }, []);

  const handleChangeStatus = useCallback(
    (stageId: string, status: StageStatus) => {
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, status } : s))
      );
      trackSaving(() => updateStageStatus(stageId, status));
    },
    [trackSaving]
  );

  const handleChangeDeadline = useCallback(
    (stageId: string, deadline: string | null) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId ? { ...s, internal_deadline: deadline } : s
        )
      );
      trackSaving(() => updateStageDeadline(stageId, deadline));
    },
    [trackSaving]
  );

  const handleChangeAssignee = useCallback(
    (stageId: string, userId: string | null) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId ? { ...s, assignee_user_id: userId } : s
        )
      );
      trackSaving(() => updateStageAssignee(stageId, userId));
    },
    [trackSaving]
  );

  const handleChangeNotes = useCallback(
    (stageId: string, notes: string | null) => {
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, notes } : s))
      );
      trackSaving(() => updateStageNotes(stageId, notes));
    },
    [trackSaving]
  );

  const handleDeadlineChange = (value: string) => {
    setDeadlineDraft(value);
    if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
    deadlineTimerRef.current = setTimeout(() => {
      trackSaving(() => updatePeriodDeadline(periodId, value || null));
    }, 800);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">
            {clientName}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {taskTypeName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Hard Deadline
            </label>
            <input
              type="date"
              value={deadlineDraft}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <SavingIndicator saving={saving} />
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            tasks={stageTasks[stage.id] ?? []}
            teamMembers={teamMembers}
            onChangeStatus={handleChangeStatus}
            onChangeDeadline={handleChangeDeadline}
            onChangeAssignee={handleChangeAssignee}
            onChangeNotes={handleChangeNotes}
          />
        ))}
      </div>
    </div>
  );
}
