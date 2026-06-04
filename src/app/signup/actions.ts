"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(
  _prevState: { error?: string },
  formData: FormData
) {
  const email = formData.get("email") as string;
  const fullName = ((formData.get("full_name") as string) ?? "").trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  const code = ((formData.get("code") as string) ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (!fullName) {
    return { error: "Full name is required" };
  }

  // --- Signup gate (Opsi B): require a valid invite code ---
  // Fail closed: if no code is configured on the server, signups are
  // disabled entirely. Set SIGNUP_CODE in your environment to enable.
  const expectedCode = process.env.SIGNUP_CODE;
  if (!expectedCode) {
    return {
      error: "Signup is currently disabled. Please contact your administrator.",
    };
  }
  if (code !== expectedCode) {
    return { error: "Invalid invite code" };
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

  // Create profile — use the name they provided, fallback to email
  await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: fullName || user.email,
    password_set: true,
  });

  // Atomic, race-safe role assignment (first user => leader, else staff).
  await supabase.rpc("assign_user_role");

  redirect("/dashboard");
}
