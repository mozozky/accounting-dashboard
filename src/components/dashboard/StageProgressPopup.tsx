"use client";

import { useEffect } from "react";
import type { StageStatus } from "@/lib/types";

export interface StagePopupItem {
  stage_name: string;
  status: StageStatus;
  completed_at: string | null;
  completed_by_name: string | null;
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

const STATUS_LABELS: Record<StageStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  blocked: "Blocked",
  not_started: "Not Started",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export default function StageProgressPopup({
  open,
  onClose,
  clientName,
  taskTypeName,
  stages,
}: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{clientName}</h3>
            <p className="text-xs text-zinc-500">{taskTypeName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="pb-2">Stage</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Done By</th>
                <th className="pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-800/50 text-sm"
                >
                  <td className="py-2.5 text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${STAGE_COLORS[stage.status]}`}
                      />
                      {stage.stage_name}
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="text-xs text-zinc-400">
                      {STATUS_LABELS[stage.status]}
                    </span>
                  </td>
                  <td className="py-2.5 text-zinc-400">
                    {stage.completed_by_name ?? "-"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-zinc-500">
                    {formatDate(stage.completed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-800 px-5 py-3 text-right">
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
