"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(
  _prevState: { error?: string },
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: "Sign up failed" };
  }

  // Create profile
  await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: user.email,
    password_set: true,
  });

  // Assign role: staff (leader already exists from first user)
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!existingRole) {
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    await supabase.from("user_roles").insert({
      user_id: user.id,
      role: (count ?? 0) === 0 ? "leader" : "staff",
    });
  }

  redirect("/dashboard");
}
