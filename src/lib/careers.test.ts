import { describe, expect, it, vi } from "vitest";
import { extractKeywords, matchResume } from "./match";
import { buildJobQuestions, isCredential } from "./questions";
import { detectLevel } from "./jobs/level";
import { LICENCES_HEADING, resumeBlocks } from "./export/blocks";
import type { Job, Profile } from "./types";

const ELECTRICIAN = `Licensed Electrician (309A) – Industrial
We are hiring a journeyperson electrician for our Hamilton plant.
Requirements:
• Valid Ontario 309A Red Seal certificate of qualification
• WHMIS and Working at Heights training; lockout/tagout procedures
• Strong blueprint reading and troubleshooting of PLC controls
• Valid G licence and own hand tools`;

const NURSE = `Registered Practical Nurse (RPN) – Long-Term Care
Current registration with the College of Nurses of Ontario as an RPN.
Valid BLS certification. Experience with medication administration, wound care and dementia care.
Charting in PointClickCare. Rotating shifts including weekends.`;

const job = (over: Partial<Job>): Job => ({
  id: "j1",
  source: "mock",
  title: "Electrician",
  company: "Steel Co",
  location: "Hamilton, ON",
  remote: false,
  postedAt: null,
  description: ELECTRICIAN,
  applyUrl: "",
  ...over,
});

describe("keywords work outside office jobs", () => {
  it("finds trades credentials and skills", () => {
    const k = extractKeywords(ELECTRICIAN);
    expect(k).toEqual(expect.arrayContaining(["309a", "red seal", "whmis", "working at heights", "lockout/tagout", "blueprint reading", "plc", "g licence"]));
  });

  it("finds nursing credentials and skills", () => {
    const k = extractKeywords(NURSE);
    expect(k).toEqual(expect.arrayContaining(["rpn", "bls", "medication administration", "wound care", "dementia care", "charting"]));
  });

  it("scores a trades resume against a trades posting", () => {
    const m = matchResume("Red Seal 309A electrician. WHMIS, Working at Heights. PLC troubleshooting.", ELECTRICIAN);
    expect(m.matched).toEqual(expect.arrayContaining(["red seal", "309a", "whmis", "plc"]));
    expect(m.missing).toContain("lockout/tagout");
    // No fragments of phrases that were already matched as a whole.
    expect(m.missing).not.toContain("seal");
    expect(m.missing).not.toContain("heights");
  });
});

describe("quick questions", () => {
  it("asks about credentials as things you hold, first", () => {
    const qs = buildJobQuestions(job({}), "Electrician with PLC troubleshooting experience");
    expect(qs[0].question).toBe("Do you hold a valid 309A Red Seal? If so, add any details (level, number, expiry, province).");
    expect(qs.some((q) => /^Are you a certified journeyperson/.test(q.question))).toBe(true);
    // Red Seal and 309A are merged into one question.
    expect(qs.filter((q) => /309A/.test(q.question))).toHaveLength(1);
    expect(qs.at(-1)?.question).toMatch(/Steel Co/);

    // Once the credentials are on the resume, it asks about experience instead.
    const withTickets = buildJobQuestions(
      job({}),
      "Red Seal 309A electrician. WHMIS, Working at Heights, lockout/tagout. PLC. G licence.",
    );
    expect(withTickets.some((q) => /^Do you have experience with Blueprint Reading/.test(q.question))).toBe(true);
  });

  it("classifies credentials", () => {
    for (const c of ["red seal", "309a", "az licence", "smart serve", "rpn", "bls", "whmis", "enhanced reliability"]) {
      expect(isCredential(c)).toBe(true);
    }
    for (const c of ["blueprint reading", "wound care", "customer service", "sql", "reliability"]) {
      expect(isCredential(c)).toBe(false);
    }
  });
});

describe("job levels across careers", () => {
  it("handles trades, healthcare and kitchen titles", () => {
    expect(detectLevel("Journeyperson Electrician")).toBe("intermediate");
    expect(detectLevel("Electrical Foreman")).toBe("lead");
    expect(detectLevel("Apprentice Plumber")).toBe("entry");
    expect(detectLevel("General Labourer")).toBe("entry");
    expect(detectLevel("Charge Nurse")).toBe("lead");
    expect(detectLevel("Head Chef")).toBe("lead");
    expect(detectLevel("Industrial Electrician (309A)", "We are hiring a journeyperson electrician")).toBe("intermediate");
  });
});

describe("licences-first resume layout", () => {
  const profile: Profile = {
    name: "Sam Rivera",
    headline: "Industrial Electrician",
    email: "sam@example.com",
    phone: "905-555-0100",
    location: "Hamilton, ON",
    links: [],
    summary: "Red Seal electrician.",
    experience: [{ title: "Electrician", company: "Steel Co", location: "Hamilton, ON", start: "Jan 2020", end: "Present", bullets: ["Maintained PLC-controlled lines"] }],
    skills: ["PLC troubleshooting"],
    education: [],
    certifications: ["Red Seal 309A", "WHMIS"],
    projects: [],
    volunteer: [],
  };
  const headings = (licencesFirst: boolean) =>
    resumeBlocks(profile, { licencesFirst }).flatMap((b) => (b.type === "heading" ? [b.text] : []));

  it("puts licences right after the summary when asked", () => {
    expect(headings(true)).toEqual(["Summary", LICENCES_HEADING, "Skills", "Experience"]);
  });

  it("keeps them near the end otherwise", () => {
    expect(headings(false)).toEqual(["Summary", "Skills", "Experience", LICENCES_HEADING]);
  });
});

describe("automatic application kit", () => {
  it("builds resume, cover letter and interview prep, then marks the job ready", async () => {
    vi.stubEnv("JOBFINDER_DB", ":memory:");
    vi.stubEnv("AI_MOCK", "1");
    vi.resetModules();
    const db = await import("./db");
    const service = await import("./service");

    db.saveProfile({
      profile: {
        name: "Sam Rivera", headline: "Electrician", email: "sam@example.com", phone: "", location: "Hamilton, ON",
        links: [], summary: "", experience: [], skills: ["PLC"], education: [], certifications: ["WHMIS"], projects: [], volunteer: [],
      },
      rawText: "Sam Rivera electrician",
      targetLevel: "intermediate",
      canadianSpelling: true,
    });
    const j = db.createManualJob({ title: "Industrial Electrician", company: "Steel Co", location: "Hamilton, ON", description: ELECTRICIAN, applyUrl: "" });
    db.setApplicationStatus(j.id, "interested");

    expect(await service.startPrepare(j.id)).toBe(true);
    expect(db.getApplication(j.id)?.prep.state).toBe("preparing");
    // A second tap while it's running doesn't start another build.
    expect(await service.startPrepare(j.id)).toBe(false);

    await service.runPrepare(j.id);
    const app = db.getApplication(j.id)!;
    expect(app.prep.state).toBe("done");
    expect(app.status).toBe("ready");
    expect(db.listDocuments({ jobId: j.id }).map((d) => d.kind).sort()).toEqual(["cover", "interview", "resume"]);
    vi.unstubAllEnvs();
  });

  it("refuses to start without a resume on file", async () => {
    vi.stubEnv("JOBFINDER_DB", ":memory:");
    vi.stubEnv("AI_MOCK", "1");
    vi.resetModules();
    const service = await import("./service");
    await expect(service.startPrepare("missing")).rejects.toThrow(/My resume/);
    vi.unstubAllEnvs();
  });
});
