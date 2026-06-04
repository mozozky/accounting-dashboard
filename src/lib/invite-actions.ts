"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function removeMember(userId: string) {
  const supabase = await createClient();

  // 1. Must be authenticated
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user) return { error: "Not authenticated" };

  // 2. Cannot remove yourself
  if (currentUser.user.id === userId) {
    return { error: "Cannot remove yourself" };
  }

  // 3. Only leaders can remove members
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.user.id)
    .single();

  if (roleData?.role !== "leader") {
    return { error: "Only leaders can remove members" };
  }

  // 4. Delete auth user FIRST via admin client (cascades to profiles via
  //    the FK on delete cascade). user_roles will also cascade-delete.
  //    Doing this first avoids the orphaned-state where user_roles is gone
  //    but the auth user still exists and could log in.
  try {
    const admin = createAdminClient();
    const { error: adminError } = await admin.auth.admin.deleteUser(userId);
    if (adminError) {
      // Surface the real error so the UI can show it
      return { error: `Failed to delete user: ${adminError.message}` };
    }
  } catch (e) {
    return {
      error: `Failed to delete user: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 5. Cascade from auth.users -> profiles -> user_roles handles DB cleanup.
  //    Belt-and-suspenders: explicitly delete user_roles in case the cascade
  //    hasn't propagated yet (e.g. if the trigger fires async).
  await supabase.from("user_roles").delete().eq("user_id", userId);

  revalidatePath("/team");
  return { success: true };
}

/**
 * Promote/demote a member between 'leader' and 'staff'. Leader-only.
 * A leader cannot demote themselves (prevents locking everyone out of
 * leader-only actions).
 */
export async function setMemberRole(userId: string, role: "leader" | "staff") {
  if (role !== "leader" && role !== "staff") {
    return { error: "Invalid role" };
  }

  const supabase = await createClient();

  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user) return { error: "Not authenticated" };

  // Only leaders can change roles
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.user.id)
    .single();

  if (roleData?.role !== "leader") {
    return { error: "Only leaders can change roles" };
  }

  // Prevent self-demotion (avoid removing the last leader by accident)
  if (currentUser.user.id === userId && role !== "leader") {
    return { error: "You cannot demote yourself" };
  }

  // Upsert the role (insert if missing, update otherwise)
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/team");
  return { success: true };
}
