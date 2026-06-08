"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatMonthYearID } from "@/lib/utils/date";
import type { StageStatus } from "@/lib/types";

export interface MyTask {
  id: string;
  stageName: string;
  status: StageStatus;
  internalDeadline: string | null;
  periodId: string;
  periodMonth: number;
  periodYear: number;
  clientId: string;
  clientName: string;
  clientActive: boolean | undefined;
  taskTypeName: string;
}

const PAGE_SIZE = 15;

export default function MyTasksClient({ tasks }: { tasks: MyTask[] }) {
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Distinct months present in the data, sorted newest first.
  const monthOptions = useMemo(() => {
    const seen = new Map<string, { month: number; year: number }>();
    for (const t of tasks) {
      const key = `${t.periodYear}-${t.periodMonth}`;
      if (!seen.has(key)) seen.set(key, { month: t.periodMonth, year: t.periodYear });
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    );
  }, [tasks]);

  const taskTypeOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.taskTypeName).filter(Boolean))).sort(),
    [tasks]
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (monthFilter !== "all" && `${t.periodYear}-${t.periodMonth}` !== monthFilter) {
        return false;
      }
      if (taskTypeFilter !== "all" && t.taskTypeName !== taskTypeFilter) {
        return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, monthFilter, taskTypeFilter, statusFilter]);

  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [monthFilter, taskTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const selectClass =
    "rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">My Tasks</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Months</option>
          {monthOptions.map((m) => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              {formatMonthYearID(m.month, m.year)}
            </option>
          ))}
        </select>

        <select
          value={taskTypeFilter}
          onChange={(e) => setTaskTypeFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Task Types</option>
          {taskTypeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All Status</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Task Type</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50 ${
                  t.internalDeadline &&
                  new Date(t.internalDeadline) < new Date() &&
                  t.status !== "done"
                    ? "border-l-2 border-l-red-500 bg-red-950/10"
                    : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-white">{t.clientName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {t.taskTypeName}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {formatMonthYearID(t.periodMonth, t.periodYear)}
                </td>
                <td className="px-4 py-3 text-zinc-400">{t.stageName}</td>
                <td className="px-4 py-3 tabular-nums">
                  {t.internalDeadline ? (
                    <span
                      className={
                        new Date(t.internalDeadline) < new Date() && t.status !== "done"
                          ? "text-red-400"
                          : "text-zinc-400"
                      }
                    >
                      {new Date(t.internalDeadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${t.clientId}/${t.periodId}`}
                    className="rounded-md bg-white px-3 py-1 text-xs font-medium text-black hover:bg-zinc-200"
                  >
                    Buka
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs tabular-nums text-zinc-400">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
