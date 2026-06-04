import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function ensureUserProfile(user: User) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      password_set: false,
    });
  } else {
    await supabase
      .from("profiles")
      .update({
        email: user.email,
      })
      .eq("id", user.id);
  }

  // Atomic, race-safe role assignment via SECURITY DEFINER RPC.
  // First user ever => 'leader', everyone else => 'staff'. Idempotent.
  await supabase.rpc("assign_user_role");
}

/**
 * Returns the role ('leader' | 'staff') of the currently authenticated
 * user, or null if unauthenticated / no role assigned.
 */
export async function getUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return roleData?.role ?? null;
}

/**
 * Authorization guard for server actions. Returns an `{ error }` object
 * if the caller is not a leader, or `null` if they are allowed to proceed.
 *
 * Usage:
 *   const denied = await requireLeader();
 *   if (denied) return denied;
 */
export async function requireLeader(): Promise<{ error: string } | null> {
  const role = await getUserRole();
  if (role !== "leader") {
    return { error: "Only leaders can perform this action" };
  }
  return null;
}
