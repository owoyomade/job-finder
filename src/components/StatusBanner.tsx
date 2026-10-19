"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Status {
  aiMock: boolean;
  jobsMock: boolean;
  hasAnthropicKey: boolean;
  sources: Record<string, { available: boolean; reason?: string }>;
}

/** Tells the user when they're seeing sample data or a key is missing. */
export function StatusBanner() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    api<Status>("/api/status").then(setS).catch(() => {});
  }, []);
  if (!s) return null;
  const notes: string[] = [];
  if (s.jobsMock) notes.push("Job search is showing sample listings (JOBS_MOCK=1).");
  if (s.aiMock)
    notes.push(
      s.hasAnthropicKey
        ? "AI features are in sample mode (AI_MOCK=1)."
        : "AI features are in sample mode until ANTHROPIC_API_KEY is set.",
    );
  if (!s.jobsMock && !s.sources.jsearch?.available)
    notes.push("Set RAPIDAPI_KEY to search LinkedIn, Indeed and Glassdoor through JSearch.");
  if (!notes.length) return null;
  return (
    <div className="border-b border-amber/40 bg-amber-soft px-4 py-2 text-sm md:px-8">
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
}
