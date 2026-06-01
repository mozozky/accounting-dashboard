"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function inviteMember(email: string) {
  const supabase = await createClient();
  const { data: currentSession } = await supabase.auth.getUser();
  if (!currentSession?.user) return { error: "Not authenticated" };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentSession.user.id)
    .single();

  if (roleData?.role !== "leader") {
    return { error: "Only team leaders can invite members" };
  }

  const redirectTo = `${
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  }/auth/callback?next=/auth/set-password`;

  const admin = createAdminClient();
  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo }
  );

  if (error) return { error: error.message };

  const newUser = inviteData?.user;
  if (newUser) {
    // Insert profile
    await supabase.from("profiles").upsert(
      {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.email,
      },
      { onConflict: "id" }
    );

    // Insert role as staff
    const { data: existing } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", newUser.id)
      .single();

    if (!existing) {
      await supabase.from("user_roles").insert({
        user_id: newUser.id,
        role: "staff",
      });
    }
  }

  revalidatePath("/team");
  return { success: true };
}

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
