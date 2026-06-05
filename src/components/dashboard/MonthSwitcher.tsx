"use client";

import Link from "next/link";
import { currentMonthYearWIB } from "@/lib/utils/date";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
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

  const { month: curMonth, year: curYear } = currentMonthYearWIB();
  const isCurrentMonth = month === curMonth && year === curYear;

  return (
    <div className="mt-1 flex items-center gap-2">
      <Link
        href={`${baseUrl}?month=${prevMonth}&year=${prevYear}`}
        className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 3L5 7l4 4" />
        </svg>
      </Link>

      <span
        className={`text-sm font-semibold tabular-nums ${
          isCurrentMonth ? "text-white" : "text-amber-400"
        }`}
      >
        {MONTH_NAMES[month - 1]} {year}
      </span>

      <Link
        href={`${baseUrl}?month=${nextMonth}&year=${nextYear}`}
        className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3l4 4-4 4" />
        </svg>
      </Link>

      {/* Badge + link balik ke bulan berjalan, muncul kalau lagi browse bulan lain */}
      {!isCurrentMonth && (
        <Link
          href={`${baseUrl}?month=${curMonth}&year=${curYear}`}
          className="ml-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          Kembali ke bulan ini
        </Link>
      )}
    </div>
  );
}
