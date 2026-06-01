interface StatsBarProps {
  totalActive: number;
  overdue: number;
  dueThisWeek: number;
  doneThisMonth: number;
  priorUnfinished: number;
}

export default function QuickStatsBar({
  totalActive,
  overdue,
  dueThisWeek,
  doneThisMonth,
  priorUnfinished,
}: StatsBarProps) {
  const stats = [
    { label: "Total Active", value: totalActive },
    { label: "Overdue", value: overdue, alert: overdue > 0 },
    { label: "Due This Week", value: dueThisWeek },
    { label: "Done This Month", value: doneThisMonth },
    {
      label: "Prior Unfinished",
      value: priorUnfinished,
      alert: priorUnfinished > 0,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              stat.alert ? "text-red-400" : "text-white"
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
