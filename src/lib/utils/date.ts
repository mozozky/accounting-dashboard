/**
 * Shared date utilities — pinned to Asia/Jakarta (WIB, UTC+7).
 *
 * Why: Vercel serverless runs in UTC. Without pinning, "today" can be
 * off by one day for users in WIB near midnight, causing incorrect
 * overdue / due-this-week calculations.
 */

const TZ = "Asia/Jakarta";

/** Returns today's date string (YYYY-MM-DD) in WIB. */
export function todayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

/**
 * Returns the date string (YYYY-MM-DD) for N days from now in WIB.
 * Positive N = future, negative N = past.
 */
export function daysFromNowWIB(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/**
 * Computes a deadline date string (YYYY-MM-DD) as:
 *   the `day`-th day of the NEXT month after the given month/year.
 * Returns null if day is null/0.
 *
 * Example: computeDeadline(5, 2026, 15) => "2026-06-15"
 * Clamps to the last day of the month if day > month length.
 */
export function computeDeadline(
  month: number,
  year: number,
  day: number | null
): string | null {
  if (!day) return null;
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const m = String(nextMonth).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${nextYear}-${m}-${d}`;
}

/**
 * Determines the overall status of a period given its stages and hard deadline.
 * Priority: blocked > overdue > done > in_progress > not_started > no_period
 */
export type OverallStatus =
  | "not_started"
  | "in_progress"
  | "done"
  | "blocked"
  | "overdue"
  | "no_period";

export function determineStatus(
  stages: { status: string }[],
  hardDeadline: string | null
): OverallStatus {
  if (stages.length === 0) return "no_period";

  if (stages.some((s) => s.status === "blocked")) return "blocked";

  const allDone = stages.every((s) => s.status === "done");

  if (!allDone && hardDeadline) {
    const today = todayWIB();
    if (hardDeadline < today) return "overdue";
  }

  if (allDone) return "done";
  if (stages.some((s) => s.status === "in_progress")) return "in_progress";
  if (stages.every((s) => s.status === "not_started")) return "not_started";
  return "in_progress";
}
