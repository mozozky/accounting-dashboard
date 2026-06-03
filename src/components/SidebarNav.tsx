"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Tasks", href: "/my-tasks" },
  { label: "Clients", href: "/clients" },
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/settings" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname.startsWith("/dashboard") || pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
          >
            {item.label}
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
