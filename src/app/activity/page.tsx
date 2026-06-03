import { createClient } from "@/lib/supabase/server";
import type { ActivityLog } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Activity Log</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Recent {logs?.length ?? 0} activities
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3 w-32">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log: ActivityLog) => (
              <tr
                key={log.id}
                className="border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                  {timeAgo(log.created_at)}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {log.user_name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {log.entity_type}{log.entity_name ? `: ${log.entity_name}` : ""}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {log.details ?? "-"}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
