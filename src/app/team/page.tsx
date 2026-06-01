import { createClient } from "@/lib/supabase/server";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const supabase = await createClient();

  const { data: currentUser } = await supabase.auth.getUser();

  const { data: currentRoleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser?.user?.id ?? "")
    .single();

  const currentRole = currentRoleData?.role ?? "staff";

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at, user_roles(role)")
    .order("created_at");

  const memberList = (members ?? []).map((m) => {
    const userRoles = m.user_roles as unknown as { role: string }[] | { role: string } | null;
    const role = Array.isArray(userRoles) ? userRoles[0]?.role : userRoles?.role;

    return {
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      role: role ?? "staff",
      created_at: m.created_at,
    };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Team</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {memberList.length} member{memberList.length !== 1 ? "s" : ""}
        </p>
      </div>

      <TeamClient
        members={memberList}
        currentUserId={currentUser?.user?.id ?? ""}
        currentRole={currentRole}
      />
    </div>
  );
}
