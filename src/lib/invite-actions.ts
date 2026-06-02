"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function removeMember(userId: string) {
  const supabase = await createClient();
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user) return { error: "Not authenticated" };

  if (currentUser.user.id === userId) {
    return { error: "Cannot remove yourself" };
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.user.id)
    .single();

  if (roleData?.role !== "leader") {
    return { error: "Only leaders can remove members" };
  }

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath("/team");
  return { success: true };
}
