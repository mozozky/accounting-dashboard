"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import StageTimeline from "./StageTimeline";
import StageProgressPopup, {
  type StagePopupItem,
} from "./StageProgressPopup";
import {
  generatePeriodForClientAction,
  generateNextMonthAction,
  bulkAdvanceStage,
} from "@/lib/actions";
import type { StageStatus } from "@/lib/types";

const PAGE_SIZE = 20;

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
  const [popupRow, setPopupRow] = useState<ClientRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulking, setBulking] = useState(false);

  const rowKey = (c: ClientRow) => `${c.clientId}-${c.taskTypeId}`;

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

  // --- Group filtered rows into status buckets for sectioned display ---
  const groups = useMemo(() => {
    const inProgress: ClientRow[] = [];
    const notStarted: ClientRow[] = [];
    const done: ClientRow[] = [];
    for (const c of filtered) {
      if (c.status === "done") done.push(c);
      else if (c.status === "not_started" || c.status === "no_period")
        notStarted.push(c);
      else inProgress.push(c); // in_progress, blocked, overdue
    }
    return { inProgress, notStarted, done };
  }, [filtered]);

  // Independent pagination per section.
  const [pages, setPages] = useState({ inProgress: 1, notStarted: 1, done: 1 });

  // Reset all section pages whenever the filters change.
  useEffect(() => {
    setPages({ inProgress: 1, notStarted: 1, done: 1 });
  }, [search, picFilter, statusFilter, taskTypeFilter]);

  const handleGeneratePeriod = async (clientId: string, taskTypeId: string) => {
    const key = `${clientId}-${taskTypeId}`;
    setGenerating((prev) => ({ ...prev, [key]: true }));
    const result = await generatePeriodForClientAction(
      clientId,
      taskTypeId,
      currentMonth,
      currentYear
    );
    setGenerating((prev) => ({ ...prev, [key]: false }));
    if (result.error) toast.error(result.error);
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const result = await generateNextMonthAction();
    setGeneratingAll(false);
    if (result.error && "error" in result) toast.error(result.error as string);
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectGroup = (rows: ClientRow[]) => {
    const keys = rows.map(rowKey);
    const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleBulkAction = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulking(true);
    const periodIds = Array.from(selected)
      .map((k) => filtered.find((c) => rowKey(c) === k))
      .filter(Boolean)
      .map((c) => c!.periodId)
      .filter(Boolean) as string[];

    const result = await bulkAdvanceStage(periodIds, bulkStatus);
    setBulking(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Updated ${periodIds.length} period(s)`);
      setSelected(new Set());
      setBulkStatus("");
    }
  };

  const getRowClasses = (c: ClientRow) => {
    if (c.status === "overdue" || c.status === "blocked")
      return "border-l-2 border-l-red-500 bg-red-950/10";
    if (
      c.hardDeadline &&
      c.status !== "done" &&
      c.status !== "no_period" &&
      new Date(c.hardDeadline) <= new Date(Date.now() + 7 * 86400000)
    )
      return "border-l-2 border-l-amber-500 bg-amber-950/10";
    return "";
  };

  const renderRow = (client: ClientRow, i: number) => (
    <motion.tr
      key={rowKey(client)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: i * 0.03 }}
      className={`border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50 ${getRowClasses(client)}`}
    >
      <td className="w-8 px-2 py-3">
        <input
          type="checkbox"
          checked={selected.has(rowKey(client))}
          onChange={() => toggleSelect(rowKey(client))}
          className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 accent-white"
        />
      </td>
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
      <td className="px-4 py-3 text-zinc-400">{client.picName ?? "-"}</td>
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
            disabled={generating[`${client.clientId}-${client.taskTypeId}`]}
            className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {generating[`${client.clientId}-${client.taskTypeId}`]
              ? "..."
              : "Generate"}
          </button>
        )}
      </td>
    </motion.tr>
  );

  const renderSection = (
    title: string,
    rows: ClientRow[],
    pageKey: keyof typeof pages,
    accent: string
  ) => {
    if (rows.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(pages[pageKey], totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);
    const groupKeys = rows.map(rowKey);
    const allSelected =
      groupKeys.length > 0 && groupKeys.every((k) => selected.has(k));

    return (
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {rows.length}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="w-8 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleSelectGroup(rows)}
                    className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 accent-white"
                  />
                </th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Task Type</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>{pageRows.map((client, i) => renderRow(client, i))}</tbody>
          </table>
        </div>

        {rows.length > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Showing {pageStart + 1}–
              {Math.min(pageStart + PAGE_SIZE, rows.length)} of {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPages((p) => ({ ...p, [pageKey]: Math.max(1, safePage - 1) }))
                }
                disabled={safePage <= 1}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs tabular-nums text-zinc-400">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPages((p) => ({
                    ...p,
                    [pageKey]: Math.min(totalPages, safePage + 1),
                  }))
                }
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
  };

  return (
    <div>
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

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2">
          <span className="text-xs text-zinc-400">{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white"
          >
            <option value="">Set status...</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={!bulkStatus || bulking}
            className="rounded bg-white px-2 py-1 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-40"
          >
            {bulking ? "..." : "Apply"}
          </button>
        </div>
      )}

      {renderSection("In Progress", groups.inProgress, "inProgress", "bg-amber-500")}
      {renderSection("Not Started", groups.notStarted, "notStarted", "bg-zinc-500")}
      {renderSection("Done", groups.done, "done", "bg-emerald-500")}

      {filtered.length === 0 && (
        <div className="rounded-lg border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          No clients found
        </div>
      )}

      {popupRow && popupRow.stageDetails && (
        <StageProgressPopup
          open={true}
          onClose={() => setPopupRow(null)}
          clientName={popupRow.clientName}
          taskTypeName={popupRow.taskTypeName}
          stages={popupRow.stageDetails}
          hardDeadline={popupRow.hardDeadline}
        />
      )}
    </div>
  );
}
