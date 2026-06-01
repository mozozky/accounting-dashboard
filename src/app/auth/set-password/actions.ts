"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(
  _prevState: { error?: string },
  formData: FormData
) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", data.user.id);
  }

  revalidatePath("/auth/set-password");
  redirect("/dashboard");
}
