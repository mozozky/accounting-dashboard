import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Prevent open redirect: only allow internal, non-protocol-relative paths.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";
  const supabase = await createClient();

  if (code) {
    // Magic link / OAuth flow: exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Get user (works for both code-exchange and invite/pre-set session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no-session`);
  }

  try {
    await ensureUserProfile(user);
  } catch (e) {
    console.error("ensureUserProfile failed:", e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
