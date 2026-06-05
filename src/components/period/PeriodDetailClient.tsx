"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StageCard from "./StageCard";
import SavingIndicator from "./SavingIndicator";
import {
  updateStageStatus,
  updateStageDeadline,
  updateStagePlannedDate,
  updateStageAssignee,
  updateStageNotes,
  updatePeriodDeadline,
} from "@/lib/period-actions";
import { currentMonthYearWIB, formatMonthYearID } from "@/lib/utils/date";
import type { StageStatus, StageTask } from "@/lib/types";

interface StageData {
  id: string;
  stage_name: string;
  order_index: number;
  status: StageStatus;
  planned_date: string | null;
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
  periodMonth: number;
  periodYear: number;
}

export default function PeriodDetailClient({
  periodId,
  stages: initialStages,
  stageTasks,
  hardDeadline: initialDeadline,
  teamMembers,
  clientName,
  taskTypeName,
  periodMonth,
  periodYear,
}: Props) {
  const [stages, setStages] = useState(initialStages);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const deadlineTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [deadlineDraft, setDeadlineDraft] = useState(initialDeadline ?? "");

  // Period month context — used to make the working period obvious and to
  // warn when the user is editing a period that isn't the current month.
  const periodLabel = formatMonthYearID(periodMonth, periodYear);
  const { month: curMonth, year: curYear } = currentMonthYearWIB();
  const isCurrentMonth = periodMonth === curMonth && periodYear === curYear;
  const isPast =
    periodYear < curYear ||
    (periodYear === curYear && periodMonth < curMonth);

  /**
   * Wraps a server action call with saving state + error handling.
   * On failure: shows a toast, surfaces an inline error badge, and
   * calls the optional `onRollback` to revert the optimistic update.
   */
  const trackSaving = useCallback(
    async (
      fn: () => Promise<{ error?: string } | unknown>,
      onRollback?: () => void
    ) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await fn();
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof (result as { error: string }).error === "string"
        ) {
          const msg = (result as { error: string }).error;
          setSaveError(msg);
          toast.error(`Gagal menyimpan: ${msg}`);
          onRollback?.();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setSaveError(msg);
        toast.error(`Gagal menyimpan: ${msg}`);
        onRollback?.();
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleChangeStatus = useCallback(
    (stageId: string, status: StageStatus) => {
      // Capture previous value for rollback
      const prev = stages.find((s) => s.id === stageId)?.status;
      setStages((cur) =>
        cur.map((s) => (s.id === stageId ? { ...s, status } : s))
      );
      trackSaving(
        () => updateStageStatus(stageId, status),
        () =>
          setStages((cur) =>
            cur.map((s) =>
              s.id === stageId && prev !== undefined ? { ...s, status: prev } : s
            )
          )
      );
    },
    [stages, trackSaving]
  );

  const handleChangeDeadline = useCallback(
    (stageId: string, deadline: string | null) => {
      const prev = stages.find((s) => s.id === stageId)?.internal_deadline;
      setStages((cur) =>
        cur.map((s) =>
          s.id === stageId ? { ...s, internal_deadline: deadline } : s
        )
      );
      trackSaving(
        () => updateStageDeadline(stageId, deadline),
        () =>
          setStages((cur) =>
            cur.map((s) =>
              s.id === stageId ? { ...s, internal_deadline: prev ?? null } : s
            )
          )
      );
    },
    [stages, trackSaving]
  );

  const handleChangePlannedDate = useCallback(
    (stageId: string, date: string | null) => {
      const prev = stages.find((s) => s.id === stageId)?.planned_date;
      setStages((cur) =>
        cur.map((s) =>
          s.id === stageId ? { ...s, planned_date: date } : s
        )
      );
      trackSaving(
        () => updateStagePlannedDate(stageId, date),
        () =>
          setStages((cur) =>
            cur.map((s) =>
              s.id === stageId ? { ...s, planned_date: prev ?? null } : s
            )
          )
      );
    },
    [stages, trackSaving]
  );

  const handleChangeAssignee = useCallback(
    (stageId: string, userId: string | null) => {
      const prev = stages.find((s) => s.id === stageId)?.assignee_user_id;
      setStages((cur) =>
        cur.map((s) =>
          s.id === stageId ? { ...s, assignee_user_id: userId } : s
        )
      );
      trackSaving(
        () => updateStageAssignee(stageId, userId),
        () =>
          setStages((cur) =>
            cur.map((s) =>
              s.id === stageId ? { ...s, assignee_user_id: prev ?? null } : s
            )
          )
      );
    },
    [stages, trackSaving]
  );

  const handleChangeNotes = useCallback(
    (stageId: string, notes: string | null) => {
      const prev = stages.find((s) => s.id === stageId)?.notes;
      setStages((cur) =>
        cur.map((s) => (s.id === stageId ? { ...s, notes } : s))
      );
      trackSaving(
        () => updateStageNotes(stageId, notes),
        () =>
          setStages((cur) =>
            cur.map((s) =>
              s.id === stageId ? { ...s, notes: prev ?? null } : s
            )
          )
      );
    },
    [stages, trackSaving]
  );

  const handleDeadlineChange = (value: string) => {
    const prev = deadlineDraft;
    setDeadlineDraft(value);
    if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
    deadlineTimerRef.current = setTimeout(() => {
      trackSaving(
        () => updatePeriodDeadline(periodId, value || null),
        () => setDeadlineDraft(prev)
      );
    }, 800);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-white">{clientName}</h1>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                isCurrentMonth
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
              }`}
            >
              {periodLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">{taskTypeName}</p>
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
          <SavingIndicator saving={saving} error={saveError} />
        </div>
      </div>

      {!isCurrentMonth && (
        <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {isPast ? (
            <>
              Kamu sedang membuka period <strong>{periodLabel}</strong> (bulan
              lalu), bukan bulan berjalan ({formatMonthYearID(curMonth, curYear)}
              ). Pastikan kamu mengupdate period yang benar.
            </>
          ) : (
            <>
              Kamu sedang membuka period <strong>{periodLabel}</strong> (bulan
              mendatang), bukan bulan berjalan (
              {formatMonthYearID(curMonth, curYear)}).
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <StageCard
              stage={stage}
              tasks={stageTasks[stage.id] ?? []}
              teamMembers={teamMembers}
              onChangeStatus={handleChangeStatus}
              onChangePlannedDate={handleChangePlannedDate}
              onChangeDeadline={handleChangeDeadline}
              onChangeAssignee={handleChangeAssignee}
              onChangeNotes={handleChangeNotes}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
