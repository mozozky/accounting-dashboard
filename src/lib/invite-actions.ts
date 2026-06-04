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
