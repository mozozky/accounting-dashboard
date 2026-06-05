"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Tasks", href: "/my-tasks" },
  { label: "Clients", href: "/clients" },
  { label: "Team", href: "/team" },
  { label: "Activity", href: "/activity" },
  { label: "Settings", href: "/settings" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  // Optimistic target: the link the user just clicked. Cleared once the
  // route actually changes so the highlight moves instantly on click.
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    // Route has caught up — clear the optimistic target.
    setNavigatingTo(null);
  }, [pathname]);

  const activePath = navigatingTo ?? pathname;

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? activePath.startsWith("/dashboard") || activePath === "/"
            : activePath.startsWith(item.href);

        const isPending = navigatingTo === item.href && pathname !== item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setNavigatingTo(item.href)}
            className="relative flex items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
          >
            <span className={isActive ? "text-white" : undefined}>
              {item.label}
            </span>
            {isPending && (
              <svg
                className="h-3 w-3 animate-spin text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-md bg-zinc-800/50"
                transition={{ duration: 0.2 }}
                style={{ zIndex: -1 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
