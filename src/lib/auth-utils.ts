import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function ensureUserProfile(user: User) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

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
}
