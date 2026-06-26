"use client";

export type StatKey = "total" | "overdue" | "dueThisWeek" | "done" | "prior";

interface StatsBarProps {
  totalActive: number;
  overdue: number;
  dueThisWeek: number;
  doneThisMonth: number;
  priorUnfinished: number;
  /** Called when a card is clicked. If omitted, cards are not interactive. */
  onSelect?: (key: StatKey) => void;
  /** Highlights the card matching the currently-applied filter. */
  activeKey?: StatKey | null;
}

export default function QuickStatsBar({
  totalActive,
  overdue,
  dueThisWeek,
  doneThisMonth,
  priorUnfinished,
  onSelect,
  activeKey = null,
}: StatsBarProps) {
  const stats: { key: StatKey; label: string; value: number; alert?: boolean }[] = [
    { key: "total", label: "Total Active", value: totalActive },
    { key: "overdue", label: "Overdue", value: overdue, alert: overdue > 0 },
    { key: "dueThisWeek", label: "Due This Week", value: dueThisWeek },
    { key: "done", label: "Done This Month", value: doneThisMonth },
    {
      key: "prior",
      label: "Prior Unfinished",
      value: priorUnfinished,
      alert: priorUnfinished > 0,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => {
        const isActive = activeKey === stat.key;
        const interactive = !!onSelect;
        return (
          <button
            key={stat.key}
            type="button"
            onClick={() => onSelect?.(stat.key)}
            disabled={!interactive}
            aria-pressed={isActive}
            title={interactive ? `Filter: ${stat.label}` : undefined}
            className={`rounded-lg border bg-zinc-900 p-4 text-left transition-colors ${
              isActive
                ? "border-zinc-500 ring-1 ring-zinc-500"
                : "border-zinc-800"
            } ${
              interactive
                ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/60"
                : "cursor-default"
            }`}
          >
            <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                stat.alert ? "text-red-400" : "text-white"
              }`}
            >
              {stat.value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
