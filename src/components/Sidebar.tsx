"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const NAV = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/saved", label: "Saved jobs" },
  { href: "/interview", label: "Interview prep" },
  { href: "/documents", label: "Documents" },
  { href: "/profile", label: "My resume" },
];

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink text-paper" : "text-muted hover:bg-sunken hover:text-ink",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNavFallback() {
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted">
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
