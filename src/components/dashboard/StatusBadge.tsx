"use client";

import { motion } from "framer-motion";
import type { StageStatus } from "@/lib/types";

const STATUS_STYLES: Record<StageStatus | "overdue" | "no_period", string> = {
  blocked: "bg-red-600 text-white",
  overdue: "bg-red-600 text-white",
  in_progress: "bg-amber-500 text-black",
  not_started: "bg-zinc-600 text-white",
  done: "bg-emerald-500 text-white",
  no_period: "bg-zinc-700 text-zinc-300",
};

const STATUS_LABELS: Record<StageStatus | "overdue" | "no_period", string> = {
  blocked: "Blocked",
  overdue: "Overdue",
  in_progress: "In Progress",
  not_started: "Not Started",
  done: "Done",
  no_period: "No Period",
};

interface Props {
  status: StageStatus | "overdue" | "no_period";
}

export default function StatusBadge({ status }: Props) {
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </motion.span>
  );
}
