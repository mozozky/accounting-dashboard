import { createClient } from "@/lib/supabase/server";
import AppSidebar from "@/components/AppSidebar";
import NewClientPage from "./NewClientPage";

export default async function NewClientLayout() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 bg-zinc-950">
        <NewClientPage profiles={(profiles ?? []) as { id: string; full_name: string | null }[]} />
      </main>
    </div>
  );
}
