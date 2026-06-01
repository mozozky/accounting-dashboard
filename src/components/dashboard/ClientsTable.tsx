"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import StageTimeline from "./StageTimeline";
import StageProgressPopup, {
  type StagePopupItem,
} from "./StageProgressPopup";
import {
  generatePeriodForClientAction,
  generateNextMonthAction,
} from "@/lib/actions";
import type { StageStatus } from "@/lib/types";

export interface ClientRow {
  clientId: string;
  clientName: string;
  taskTypeId: string;
  taskTypeName: string;
  picName: string | null;
  periodId: string | null;
  stages: { status: StageStatus; stage_name: string }[];
  stageDetails: StagePopupItem[] | null;
  stageProgress: { done: number; total: number };
  hardDeadline: string | null;
  status: StageStatus | "overdue" | "no_period";
  hasPeriod: boolean;
  periodMonth: number;
  periodYear: number;
}

interface Props {
  clients: ClientRow[];
  picOptions: { id: string; name: string | null }[];
  taskTypeOptions: string[];
  currentMonth: number;
  currentYear: number;
}

export default function ClientsTable({
  clients,
  picOptions,
  taskTypeOptions,
  currentMonth,
  currentYear,
}: Props) {
  const [search, setSearch] = useState("");
  const [picFilter, setPicFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupRow, setPopupRow] = useState<ClientRow | null>(null);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search && !c.clientName.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (picFilter !== "all" && c.picName !== picFilter) {
        return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      if (taskTypeFilter !== "all" && c.taskTypeName !== taskTypeFilter) {
        return false;
      }
      return true;
    });
  }, [clients, search, picFilter, statusFilter, taskTypeFilter]);

  const handleGeneratePeriod = async (clientId: string, taskTypeId: string) => {
    const key = `${clientId}-${taskTypeId}`;
    setGenerating((prev) => ({ ...prev, [key]: true }));
    setError(null);
    const result = await generatePeriodForClientAction(
      clientId,
      taskTypeId,
      currentMonth,
      currentYear
    );
    setGenerating((prev) => ({ ...prev, [key]: false }));
    if (result.error) setError(result.error);
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    setError(null);
    const result = await generateNextMonthAction();
    setGeneratingAll(false);
    if (result.error && "error" in result) setError(result.error as string);
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />

        <select
          value={taskTypeFilter}
          onChange={(e) => setTaskTypeFilter(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
        >
          <option value="all">All Task Types</option>
          {taskTypeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={picFilter}
          onChange={(e) => setPicFilter(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
        >
          <option value="all">All PIC</option>
          {picOptions.map((p) => (
            <option key={p.id} value={p.name ?? ""}>
              {p.name ?? "Unassigned"}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="blocked">Blocked</option>
          <option value="overdue">Overdue</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
          <option value="done">Done</option>
          <option value="no_period">No Period</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generatingAll ? "Generating..." : "Generate Next Month"}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Task Type</th>
              <th className="px-4 py-3">PIC</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr
                key={`${client.clientId}-${client.taskTypeId}`}
                className="border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium">
                  {client.hasPeriod ? (
                    <Link
                      href={`/clients/${client.clientId}/${client.periodId}`}
                      className="text-white transition-colors hover:text-zinc-300"
                    >
                      {client.clientName}
                    </Link>
                  ) : (
                    <span className="text-white">{client.clientName}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {client.taskTypeName}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {client.picName ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <StageTimeline
                    stages={client.stages}
                    hasPeriod={client.hasPeriod}
                    onClick={() =>
                      setPopupRow(client.hasPeriod && client.stageDetails ? client : null)
                    }
                  />
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {client.hardDeadline
                    ? new Date(client.hardDeadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {!client.hasPeriod && (
                    <button
                      onClick={() =>
                        handleGeneratePeriod(client.clientId, client.taskTypeId)
                      }
                      disabled={
                        generating[`${client.clientId}-${client.taskTypeId}`]
                      }
                      className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {generating[`${client.clientId}-${client.taskTypeId}`]
                        ? "..."
                        : "Generate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {popupRow && popupRow.stageDetails && (
        <StageProgressPopup
          open={true}
          onClose={() => setPopupRow(null)}
          clientName={popupRow.clientName}
          taskTypeName={popupRow.taskTypeName}
          stages={popupRow.stageDetails}
        />
      )}
    </div>
  );
}
