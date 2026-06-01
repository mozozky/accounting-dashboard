import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*, profiles:pic_user_id(id, full_name)")
    .order("name");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Clients</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {clients?.length ?? 0} active clients
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">PIC</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr
                key={c.id}
                className="border-b border-zinc-800/50 text-sm transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {c.profiles?.full_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {c.contact_email ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${c.id}`}
                    className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No clients yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
