"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { DEFAULT_PREFS, type Level, type Prefs, type StoredProfile } from "@/lib/types";
import { LevelSelect } from "@/components/LevelSelect";
import { JobAlerts } from "@/components/JobAlerts";
import { Button, ErrorNote, Field, cx, inputClass } from "@/components/ui";

const STEPS = ["Welcome", "Your resume", "What you’re looking for", "How it works for you"] as const;

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [stored, setStored] = useState<StoredProfile | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    api<{ profile: StoredProfile | null }>("/api/profile").then((r) => setStored(r.profile)).catch(() => {});
    api<{ prefs: Prefs }>("/api/prefs").then((r) => setPrefs(r.prefs)).catch(() => {});
  }, []);

  async function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    const r = await api<{ prefs: Prefs }>("/api/prefs", { method: "PUT", json: patch });
    setPrefs(r.prefs);
  }

  async function finish() {
    await updatePrefs({ onboarded: true });
    router.replace("/discover");
  }

  return (
    <div className="mx-auto max-w-lg">
      <ol className="mb-6 flex gap-1.5" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-spruce" : "bg-line")}
          >
            <span className="sr-only">
              Step {i + 1} of {STEPS.length}: {s}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && <Intro onNext={() => setStep(1)} onSkip={finish} />}
      {step === 1 && (
        <ResumeStep
          stored={stored}
          onDone={(p) => {
            setStored(p);
            setStep(2);
          }}
          onSkip={() => setStep(2)}
        />
      )}
      {step === 2 && <SearchStep stored={stored} onDone={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && (
        <section>
          <h1 className="font-display text-3xl font-bold tracking-tight">How should it work for you?</h1>
          <p className="mt-1 text-muted">You can change these any time on My resume.</p>
          <div className="mt-6 space-y-2">
            {(
              [
                ["ask", "Ask me a few quick questions first", "More accurate: your answers add real details the posting asks for."],
                ["auto", "Build my application kit straight away", "Fastest: your resume, cover letter and interview prep build as you swipe."],
              ] as const
            ).map(([value, title, body]) => (
              <label
                key={value}
                className={cx(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm",
                  prefs.swipeAction === value ? "border-spruce bg-spruce-soft" : "border-line bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="swipeAction"
                  className="mt-1"
                  checked={prefs.swipeAction === value}
                  onChange={() => updatePrefs({ swipeAction: value })}
                />
                <span>
                  <span className="font-semibold">When I swipe right: {title.toLowerCase()}</span>
                  <span className="block text-muted">{body}</span>
                </span>
              </label>
            ))}
          </div>
          <JobAlerts prefs={prefs} onChange={updatePrefs} />
          <Button className="mt-8 w-full" onClick={finish}>
            Start swiping
          </Button>
        </section>
      )}
    </div>
  );
}

function Intro({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">Find your next job, ready to apply.</h1>
      <ul className="mt-6 space-y-4 text-[15px]">
        <li>
          <span className="font-semibold">Swipe through fresh Canadian jobs</span>
          <span className="block text-muted">From LinkedIn, Indeed, Glassdoor, Job Bank and government sites, for any trade or profession.</span>
        </li>
        <li>
          <span className="font-semibold">Get a kit for every job you like</span>
          <span className="block text-muted">A tailored, ATS-friendly resume, a cover letter and interview questions with answers.</span>
        </li>
        <li>
          <span className="font-semibold">Track every application</span>
          <span className="block text-muted">From interested to offer, with a daily alert when new jobs are posted.</span>
        </li>
      </ul>
      <Button className="mt-8 w-full" onClick={onNext}>
        Set up in 2 minutes
      </Button>
      <button type="button" onClick={onSkip} className="mt-3 w-full text-center text-sm text-muted hover:text-ink">
        Skip setup
      </button>
    </section>
  );
}

function ResumeStep({
  stored,
  onDone,
  onSkip,
}: {
  stored: StoredProfile | null;
  onDone: (p: StoredProfile) => void;
  onSkip: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      form.set("text", pasted);
      const r = await api<{ profile: StoredProfile }>("/api/profile/parse", { method: "POST", body: form });
      onDone(r.profile);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="font-display text-3xl font-bold tracking-tight">Add your resume</h1>
      <p className="mt-1 text-muted">
        Everything the app writes is built from it, and nothing is made up. Any field works: trades, healthcare, retail,
        office and more.
      </p>
      {stored && (
        <p className="mt-4 rounded-md bg-spruce-soft px-3 py-2 text-sm">
          You already added a resume for <span className="font-semibold">{stored.profile.name}</span>.{" "}
          <button type="button" className="font-semibold underline" onClick={() => onDone(stored)}>
            Keep it and continue
          </button>
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Upload a file" hint="PDF, DOCX or TXT, up to 5 MB">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-sunken file:px-3 file:py-1.5 file:text-sm file:font-semibold"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Or paste the text">
          <textarea className={cx(inputClass, "min-h-32")} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" busy={busy} disabled={!file && pasted.trim().length < 100} className="w-full">
          {busy ? "Reading your resume…" : "Continue"}
        </Button>
      </form>
      <button type="button" onClick={onSkip} className="mt-3 w-full text-center text-sm text-muted hover:text-ink">
        I’ll add it later
      </button>
    </section>
  );
}

function SearchStep({ stored, onDone, onBack }: { stored: StoredProfile | null; onDone: () => void; onBack: () => void }) {
  const [query, setQuery] = useState(stored?.profile.headline ?? "");
  const [location, setLocation] = useState(stored?.profile.location ?? "");
  const [level, setLevel] = useState<Level | "">(stored?.targetLevel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (stored && level) {
        await api("/api/profile", {
          method: "PUT",
          json: { profile: stored.profile, targetLevel: level, canadianSpelling: stored.canadianSpelling },
        });
      }
      await api("/api/jobs/search", {
        method: "POST",
        json: { query, location, level, postedWithin: "14", sources: ["jsearch", "jobbank", "adzuna", "remotive"] },
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="font-display text-3xl font-bold tracking-tight">What are you looking for?</h1>
      <p className="mt-1 text-muted">We’ll line up fresh postings from the last two weeks.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Job title">
          <input
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Electrician, Registered Nurse, Data Analyst"
            required
          />
        </Field>
        <Field label="City or province" hint="Leave blank for all of Canada">
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hamilton, ON" />
        </Field>
        <Field label="What level are you applying for?">
          <LevelSelect value={level} onChange={setLevel} />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" busy={busy} className="w-full">
          {busy ? "Finding jobs…" : "Find jobs"}
        </Button>
      </form>
      <button type="button" onClick={onBack} className="mt-3 w-full text-center text-sm text-muted hover:text-ink">
        Back
      </button>
    </section>
  );
}
