"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { DocumentKind, StoredDocument } from "@/lib/types";
import { Empty, PageHeader, cx } from "@/components/ui";

const KIND_LABEL: Record<DocumentKind, string> = {
  resume: "Resume",
  cover: "Cover letter",
  interview: "Interview prep",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<StoredDocument[] | null>(null);
  const [kind, setKind] = useState<DocumentKind | "all">("all");

  useEffect(() => {
    api<{ documents: StoredDocument[] }>("/api/documents").then((r) => setDocs(r.documents));
  }, []);

  async function remove(id: number) {
    if (!confirm("Delete this document? This can’t be undone.")) return;
    await api(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((d) => d?.filter((x) => x.id !== id) ?? null);
  }

  const shown = docs?.filter((d) => kind === "all" || d.kind === kind) ?? [];

  return (
    <>
      <PageHeader title="Documents" intro="Everything you’ve generated, newest first." />
      <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Document type">
        {(["all", "resume", "cover", "interview"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            type="button"
            onClick={() => setKind(k)}
            className={cx(
              "rounded-md border px-2.5 py-1 text-sm",
              kind === k ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-sunken",
            )}
          >
            {k === "all" ? "All" : KIND_LABEL[k]}
          </button>
        ))}
      </div>
      {docs === null ? (
        <p className="text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <Empty title="Nothing here yet">Open a job and tailor your resume, write a cover letter or generate interview questions.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {shown.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                {d.jobId ? (
                  <Link href={`/jobs/${encodeURIComponent(d.jobId)}`} className="font-medium hover:underline">
                    {d.title}
                  </Link>
                ) : (
                  <span className="font-medium">{d.title}</span>
                )}
                <p className="text-xs text-muted">
                  {KIND_LABEL[d.kind]}, {new Date(d.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                {d.kind !== "interview" && (
                  <a className="font-semibold text-spruce hover:underline" href={`/api/documents/${d.id}/export?format=docx`}>
                    DOCX
                  </a>
                )}
                <a className="font-semibold text-spruce hover:underline" href={`/api/documents/${d.id}/export?format=pdf`}>
                  PDF
                </a>
                {d.kind === "interview" && (
                  <a className="font-semibold text-spruce hover:underline" href={`/api/documents/${d.id}/export?format=md`}>
                    Markdown
                  </a>
                )}
                <button type="button" className="text-muted hover:text-rust" onClick={() => remove(d.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
