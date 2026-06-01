"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(fullName: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", data.user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  if (!data?.user?.email) return { error: "Not authenticated" };

  // Verify current password by attempting a sign-in (Supabase requires this)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "Current password is incorrect" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
