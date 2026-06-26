import { formatMonthYearID } from "@/lib/utils/date";

interface Props {
  month: number;
  year: number;
  total: number;
  done: number;
  overdue: number;
  blocked: number;
}

/**
 * At-a-glance completion summary for the selected month: a progress bar with
 * the percent done, plus a compact done / overdue / blocked breakdown.
 */
export default function MonthSummary({
  month,
  year,
  total,
  done,
  overdue,
  blocked,
}: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Bar tint reflects health: green when fully done, red if anything overdue,
  // amber otherwise.
  const barColor =
    pct === 100 ? "bg-emerald-500" : overdue > 0 ? "bg-red-500" : "bg-amber-500";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-white">
          {formatMonthYearID(month, year)}
        </p>
        <p className="text-sm tabular-nums text-zinc-400">
          <span className="font-semibold text-white">{pct}%</span> selesai
          <span className="ml-1 text-zinc-500">
            ({done}/{total})
          </span>
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400">
        <span>
          <span className="font-semibold text-emerald-400">{done}</span> selesai
        </span>
        <span>
          <span className="font-semibold text-zinc-300">{total - done}</span>{" "}
          belum selesai
        </span>
        <span>
          <span
            className={`font-semibold ${overdue > 0 ? "text-red-400" : "text-zinc-300"}`}
          >
            {overdue}
          </span>{" "}
          overdue
        </span>
        <span>
          <span
            className={`font-semibold ${blocked > 0 ? "text-red-400" : "text-zinc-300"}`}
          >
            {blocked}
          </span>{" "}
          blocked
        </span>
      </div>
    </div>
  );
}
