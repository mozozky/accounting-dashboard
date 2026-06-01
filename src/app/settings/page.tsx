import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", data?.user?.id ?? "")
    .single();

  return (
    <div className="p-8">
      <h1 className="mb-8 text-lg font-semibold text-white">Settings</h1>
      <SettingsClient
        email={profile?.email ?? data?.user?.email ?? ""}
        fullName={profile?.full_name ?? ""}
      />
    </div>
  );
}
