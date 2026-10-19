"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export const NAV = [
  { href: "/discover", label: "Discover", short: "Discover", icon: "M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" },
  { href: "/jobs", label: "Search", short: "Search", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.35-4.35" },
  { href: "/applications", label: "Applications", short: "Applied", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/interview", label: "Interview prep", short: "Interview", icon: "M4 5h16v11H8l-4 4V5z" },
  { href: "/profile", label: "My resume", short: "Resume", icon: "M7 3h7l5 5v13H7V3zm7 0v5h5" },
  { href: "/documents", label: "Documents", short: "Docs", icon: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4", desktopOnly: true },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
  // A full page load drops any client-side state from the signed-in session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}

/** Desktop: left sidebar. Hidden on phones, where BottomNav takes over. */
export function SidebarNav({ authEnabled }: { authEnabled: boolean }) {
  const path = usePathname();
  if (path === "/login" || path === "/welcome") return null;
  return (
    <aside className="hidden border-r border-line bg-surface px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col">
      <Link href="/discover" className="mb-8 block font-display text-xl font-extrabold tracking-tight">
        Job Finder
        <span className="block text-xs font-normal tracking-normal text-muted">Canada</span>
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(path, n.href) ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(path, n.href) ? "bg-ink text-paper" : "text-muted hover:bg-sunken hover:text-ink",
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {authEnabled && (
        <button type="button" onClick={signOut} className="mt-auto rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-sunken hover:text-ink">
          Sign out
        </button>
      )}
    </aside>
  );
}

/** Phones: app-style tab bar pinned to the bottom, clear of the home indicator. */
export function BottomNav() {
  const path = usePathname();
  if (path === "/login" || path === "/welcome") return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.filter((n) => !n.desktopOnly).map((n) => {
          const active = isActive(path, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-spruce" : "text-muted",
                )}
              >
                <Icon d={n.icon} />
                {n.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
