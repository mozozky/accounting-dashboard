"use client";

import Link from "next/link";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

interface Props {
  month: number;
  year: number;
  baseUrl?: string;
}

export default function MonthSwitcher({ month, year, baseUrl = "/dashboard" }: Props) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`${baseUrl}?month=${prevMonth}&year=${prevYear}`}
        className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 3L5 7l4 4" />
        </svg>
      </Link>

      <span className="text-sm font-medium text-white tabular-nums">
        {MONTH_NAMES[month - 1]} {year}
      </span>

      <Link
        href={`${baseUrl}?month=${nextMonth}&year=${nextYear}`}
        className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3l4 4-4 4" />
        </svg>
      </Link>
    </div>
  );
}
