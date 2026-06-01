"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { StageStatus } from "@/lib/types";

export interface PriorRow {
  clientId: string;
  clientName: string;
  taskTypeName: string;
  periodId: string;
  periodMonth: number;
  periodYear: number;
  stageProgress: { done: number; total: number };
  hardDeadline: string | null;
  status: StageStatus | "overdue";
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

interface Props {
  rows: PriorRow[];
}

export default function PriorMonthsTable({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-medium text-zinc-300">
        Prior Months — Unfinished
      </h2>
      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Task Type</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.periodId}
                className="border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium text-white">
                  {row.clientName}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {row.taskTypeName}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {MONTH_NAMES[row.periodMonth - 1]} {row.periodYear}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {row.stageProgress.done}/{row.stageProgress.total}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {row.hardDeadline
                    ? new Date(row.hardDeadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${row.clientId}/${row.periodId}`}
                    className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
