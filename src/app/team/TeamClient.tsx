"use client";

import { useState } from "react";
import { toast } from "sonner";
import { removeMember } from "@/lib/invite-actions";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

interface Props {
  members: Member[];
  currentUserId: string;
  currentRole: string;
}

export default function TeamClient({
  members,
  currentUserId,
  currentRole,
}: Props) {
  const [removing, setRemoving] = useState<string | null>(null);

  const isLeader = currentRole === "leader";

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member? Their account will be deleted.")) return;
    setRemoving(userId);
    const result = await removeMember(userId);
    setRemoving(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Member removed");
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
        <p>
          New team members? Share the signup link:{" "}
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white">
            /signup
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium text-white">
                  {m.full_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-400">{m.email ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.role === "leader"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {m.role === "leader" ? "Leader" : "Staff"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(m.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  {isLeader && m.id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={removing === m.id}
                      className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-950/30 disabled:opacity-50"
                    >
                      {removing === m.id ? "..." : "Remove"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
