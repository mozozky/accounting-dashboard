import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth-actions";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Clients", href: "/clients" },
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/settings" },
];

export default async function AppSidebar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const user = data?.user;
  let displayName = user?.email ?? "";
  let displayEmail = user?.email ?? "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    displayName = profile?.full_name ?? user.email ?? "";
    displayEmail = profile?.email ?? user.email ?? "";
  }

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-950 p-4">
      <Link
        href="/dashboard"
        className="mb-8 text-lg font-semibold text-white"
      >
        Accounting
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 pt-3">
        <div className="mb-1 px-3">
          <p className="text-sm font-medium text-white truncate">
            {displayName}
          </p>
          <p className="text-xs text-zinc-500 truncate">{displayEmail}</p>
        </div>
      </div>

      <form action={logout} className="mt-2">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
