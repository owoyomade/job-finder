"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Level, Profile, StoredProfile } from "@/lib/types";
import { LevelSelect } from "@/components/LevelSelect";
import { Button, ErrorNote, Field, Notice, PageHeader, cx, inputClass } from "@/components/ui";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default function ProfilePage() {
  const [stored, setStored] = useState<StoredProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [level, setLevel] = useState<Level | "">("");
  const [canadian, setCanadian] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [mock, setMock] = useState(false);

  function apply(p: StoredProfile | null) {
    setStored(p);
    setDraft(p?.profile ?? null);
    setLevel(p?.targetLevel ?? "");
    setCanadian(p?.canadianSpelling ?? true);
  }

  useEffect(() => {
    api<{ profile: StoredProfile | null }>("/api/profile")
      .then((r) => apply(r.profile))
      .finally(() => setLoaded(true));
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      form.set("text", pasted);
      const r = await api<{ profile: StoredProfile; mock: boolean }>("/api/profile/parse", { method: "POST", body: form });
      apply(r.profile);
      setMock(r.mock);
      setFile(null);
      setPasted("");
      setMessage("Resume read. Check the details below, then save.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const r = await api<{ profile: StoredProfile }>("/api/profile", {
        method: "PUT",
        json: { profile: draft, targetLevel: level, canadianSpelling: canadian },
      });
      apply(r.profile);
      setMessage("Profile saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const upd = <K extends keyof Profile>(k: K, v: Profile[K]) => draft && setDraft({ ...draft, [k]: v });

  if (!loaded) return <p className="text-muted">Loading…</p>;

  return (
    <>
      <PageHeader
        title="My resume"
        intro="Your master resume. Every tailored resume, cover letter and interview answer is built from what’s here, so keep it complete and accurate."
      />

      <form onSubmit={upload} className="mb-8 rounded-lg border border-line bg-surface p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold">{stored ? "Replace your resume" : "Add your resume"}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Field label="Upload a file" hint="PDF, DOCX or TXT, up to 5 MB">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-sunken file:px-3 file:py-1.5 file:text-sm file:font-semibold"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Or paste the text">
            <textarea
              className={cx(inputClass, "min-h-24")}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste your full resume here"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" busy={busy} disabled={!file && pasted.trim().length < 100}>
            {busy ? "Reading resume…" : "Read my resume"}
          </Button>
          {stored && <span className="text-xs text-muted">This replaces the details below.</span>}
        </div>
      </form>

      <ErrorNote message={error} />
      {message && (
        <p role="status" className="mb-4 text-sm text-spruce">
          {message}
        </p>
      )}
      {mock && (
        <div className="mb-4">
          <Notice>Sample mode only pulls out basic details. Add ANTHROPIC_API_KEY for full, accurate parsing.</Notice>
        </div>
      )}

      {draft && (
        <div className="space-y-8">
          <section className="grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 md:p-5">
            <Field label="What level are you applying for?" hint="Used to filter jobs and pitch your writing at the right level">
              <LevelSelect value={level} onChange={setLevel} allowAny={false} />
            </Field>
            <label className="flex items-center gap-2 self-center text-sm">
              <input type="checkbox" checked={canadian} onChange={(e) => setCanadian(e.target.checked)} />
              Use Canadian spelling (centre, labour, organization)
            </label>
          </section>

          <Section title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name">
                <input className={inputClass} value={draft.name} onChange={(e) => upd("name", e.target.value)} />
              </Field>
              <Field label="Professional title">
                <input className={inputClass} value={draft.headline} onChange={(e) => upd("headline", e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputClass} value={draft.email} onChange={(e) => upd("email", e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={draft.phone} onChange={(e) => upd("phone", e.target.value)} />
              </Field>
              <Field label="City, Province">
                <input className={inputClass} value={draft.location} onChange={(e) => upd("location", e.target.value)} />
              </Field>
              <Field label="Links" hint="One per line: LinkedIn, portfolio, GitHub">
                <textarea
                  className={cx(inputClass, "min-h-16")}
                  value={draft.links.join("\n")}
                  onChange={(e) => upd("links", lines(e.target.value))}
                />
              </Field>
            </div>
          </Section>

          <Section title="Summary">
            <textarea
              aria-label="Summary"
              className={cx(inputClass, "min-h-24")}
              value={draft.summary}
              onChange={(e) => upd("summary", e.target.value)}
            />
          </Section>

          <Section title="Skills" hint="Comma separated. List every tool and skill you can genuinely back up.">
            <textarea
              aria-label="Skills"
              className={cx(inputClass, "min-h-20")}
              value={draft.skills.join(", ")}
              onChange={(e) => upd("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </Section>

          <Section
            title="Experience"
            action={
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  upd("experience", [
                    ...draft.experience,
                    { title: "", company: "", location: "", start: "", end: "Present", bullets: [] },
                  ])
                }
              >
                Add role
              </Button>
            }
          >
            <div className="space-y-6">
              {draft.experience.map((x, i) => {
                const setX = (patch: Partial<typeof x>) =>
                  upd("experience", draft.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)));
                return (
                  <div key={i} className="grid gap-3 border-l-2 border-line pl-4 md:grid-cols-6">
                    <Field label="Job title" className="md:col-span-2">
                      <input className={inputClass} value={x.title} onChange={(e) => setX({ title: e.target.value })} />
                    </Field>
                    <Field label="Company" className="md:col-span-2">
                      <input className={inputClass} value={x.company} onChange={(e) => setX({ company: e.target.value })} />
                    </Field>
                    <Field label="Location" className="md:col-span-2">
                      <input className={inputClass} value={x.location} onChange={(e) => setX({ location: e.target.value })} />
                    </Field>
                    <Field label="Start" className="md:col-span-1">
                      <input className={inputClass} value={x.start} onChange={(e) => setX({ start: e.target.value })} placeholder="Jan 2022" />
                    </Field>
                    <Field label="End" className="md:col-span-1">
                      <input className={inputClass} value={x.end} onChange={(e) => setX({ end: e.target.value })} placeholder="Present" />
                    </Field>
                    <Field label="Achievements" hint="One per line" className="md:col-span-6">
                      <textarea
                        className={cx(inputClass, "min-h-28")}
                        value={x.bullets.join("\n")}
                        onChange={(e) => setX({ bullets: lines(e.target.value) })}
                      />
                    </Field>
                    <div className="md:col-span-6">
                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => upd("experience", draft.experience.filter((_, j) => j !== i))}
                      >
                        Remove role
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            title="Education"
            action={
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  upd("education", [...draft.education, { credential: "", school: "", location: "", year: "", details: "" }])
                }
              >
                Add education
              </Button>
            }
          >
            <div className="space-y-6">
              {draft.education.map((ed, i) => {
                const setE = (patch: Partial<typeof ed>) =>
                  upd("education", draft.education.map((e, j) => (j === i ? { ...e, ...patch } : e)));
                return (
                  <div key={i} className="grid gap-3 border-l-2 border-line pl-4 md:grid-cols-4">
                    <Field label="Degree / diploma" className="md:col-span-2">
                      <input className={inputClass} value={ed.credential} onChange={(e) => setE({ credential: e.target.value })} />
                    </Field>
                    <Field label="School" className="md:col-span-2">
                      <input className={inputClass} value={ed.school} onChange={(e) => setE({ school: e.target.value })} />
                    </Field>
                    <Field label="Location">
                      <input className={inputClass} value={ed.location} onChange={(e) => setE({ location: e.target.value })} />
                    </Field>
                    <Field label="Year">
                      <input className={inputClass} value={ed.year} onChange={(e) => setE({ year: e.target.value })} />
                    </Field>
                    <Field label="Details" className="md:col-span-2">
                      <input className={inputClass} value={ed.details} onChange={(e) => setE({ details: e.target.value })} />
                    </Field>
                    <div className="md:col-span-4">
                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => upd("education", draft.education.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Certifications" hint="One per line">
            <textarea
              aria-label="Certifications"
              className={cx(inputClass, "min-h-16")}
              value={draft.certifications.join("\n")}
              onChange={(e) => upd("certifications", lines(e.target.value))}
            />
          </Section>

          <Section title="Projects" hint="Project name on the first line, then one achievement per line. Separate projects with a blank line.">
            <textarea
              aria-label="Projects"
              className={cx(inputClass, "min-h-24")}
              value={draft.projects.map((p) => [p.name, ...p.bullets].join("\n")).join("\n\n")}
              onChange={(e) =>
                upd(
                  "projects",
                  e.target.value
                    .split(/\n\s*\n/)
                    .map(lines)
                    .filter((l) => l.length)
                    .map(([name, ...bullets]) => ({ name, bullets })),
                )
              }
            />
          </Section>

          <Section title="Volunteer experience" hint="Role | Organization | Dates on the first line, then one achievement per line. Separate entries with a blank line.">
            <textarea
              aria-label="Volunteer experience"
              className={cx(inputClass, "min-h-24")}
              value={draft.volunteer
                .map((v) => [[v.role, v.organization, v.dates].join(" | "), ...v.bullets].join("\n"))
                .join("\n\n")}
              onChange={(e) =>
                upd(
                  "volunteer",
                  e.target.value
                    .split(/\n\s*\n/)
                    .map(lines)
                    .filter((l) => l.length)
                    .map(([head, ...bullets]) => {
                      const [role = "", organization = "", dates = ""] = head.split("|").map((s) => s.trim());
                      return { role, organization, dates, bullets };
                    }),
                )
              }
            />
          </Section>

          <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
            <Button onClick={save} busy={saving} disabled={!level}>
              Save profile
            </Button>
            {!level && <span className="text-sm text-amber">Choose the level you’re applying for to save.</span>}
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
