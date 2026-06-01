import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetPasswordClient from "./SetPasswordClient";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("password_set")
    .eq("id", data.user.id)
    .single();

  if (profile?.password_set) {
    redirect("/dashboard");
  }

  return <SetPasswordClient />;
}
