"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  busy,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-spruce text-white hover:brightness-110 dark:text-[#0f1a23]",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-sunken",
        variant === "ghost" && "text-muted hover:bg-sunken hover:text-ink",
        variant === "danger" && "border border-line bg-surface text-rust hover:bg-rust-soft",
        className,
      )}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "secondary", download }: { href: string; children: ReactNode; variant?: "primary" | "secondary"; download?: boolean }) {
  return (
    <a
      href={href}
      download={download}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors",
        variant === "primary" ? "bg-spruce text-white hover:brightness-110 dark:text-[#0f1a23]" : "border border-line bg-surface hover:bg-sunken",
      )}
    >
      {children}
    </a>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1 text-sm", className)}>
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm placeholder:text-slate focus:border-spruce focus:outline-none";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-rust/40 bg-rust-soft px-3 py-2 text-sm text-rust">
      {message}
    </p>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-amber/40 bg-amber-soft px-3 py-2 text-sm">{children}</p>;
}

export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "spruce" | "amber" | "rust" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        tone === "plain" && "bg-sunken text-muted",
        tone === "spruce" && "bg-spruce-soft text-spruce",
        tone === "amber" && "bg-amber-soft text-amber",
        tone === "rust" && "bg-rust-soft text-rust",
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 max-w-[65ch] text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
