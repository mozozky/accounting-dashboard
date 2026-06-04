import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ImportClientsButton from "@/components/clients/ImportClientsButton";
import ClientRow from "@/components/clients/ClientRow";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*, profiles:pic_user_id(id, full_name)")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Clients</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {clients?.length ?? 0} active clients
          </p>
        </div>
        <div className="relative flex items-center gap-2">
          <ImportClientsButton />
          <Link
            href="/clients/new"
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Add Client
          </Link>
        </div>
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
              <ClientRow
                key={c.id}
                id={c.id}
                name={c.name}
                picName={c.profiles?.full_name ?? null}
                contactEmail={c.contact_email ?? null}
              />
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
