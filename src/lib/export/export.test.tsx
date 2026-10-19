import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { resumeBlocks, coverLetterBlocks, interviewMarkdown } from "./blocks";
import { blocksToDocx } from "./docx";
import { blocksToPdf } from "./pdf";
import { matchResume, extractKeywords, profileToText } from "../match";
import type { Profile } from "../types";

const profile: Profile = {
  name: "Jordan Lee",
  headline: "Data Analyst",
  email: "jordan@example.com",
  phone: "416-555-0100",
  location: "Toronto, ON",
  links: ["linkedin.com/in/jordanlee"],
  summary: "Data analyst with 3 years of experience building Power BI dashboards and SQL reporting.",
  experience: [
    {
      title: "Data Analyst",
      company: "Maple Retail",
      location: "Toronto, ON",
      start: "Jan 2022",
      end: "Present",
      bullets: ["Built Power BI dashboards used by 40 managers", "Automated weekly SQL reports with Python"],
    },
  ],
  skills: ["SQL", "Power BI", "Python", "Microsoft Excel", "Stakeholder management"],
  education: [{ credential: "BSc, Statistics", school: "University of Toronto", location: "Toronto, ON", year: "2021", details: "" }],
  certifications: ["Microsoft Certified: Power BI Data Analyst Associate"],
  projects: [],
  volunteer: [],
};

const KEY_TERMS = ["Power BI", "SQL", "Python", "Stakeholder management", "University of Toronto", "jordan@example.com"];

describe("ATS exports round-trip to readable text", () => {
  it("DOCX", async () => {
    const buf = await blocksToDocx(resumeBlocks(profile), "Resume");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    for (const t of KEY_TERMS) expect(value).toContain(t);
    expect(value).toContain("EXPERIENCE");
  });

  it("PDF", async () => {
    const buf = await blocksToPdf(resumeBlocks(profile), "Resume");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    for (const t of KEY_TERMS) expect(text).toContain(t);
  });

  it("cover letter PDF", async () => {
    const blocks = coverLetterBlocks(
      profile,
      { greeting: "Dear Hiring Manager,", paragraphs: ["Paragraph one.", "Paragraph two."], closing: "Sincerely," },
      { title: "Data Analyst", company: "Northern Bank", location: "Toronto, ON" },
    );
    const buf = await blocksToPdf(blocks, "Cover letter");
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
    expect(text).toContain("Re: Data Analyst");
    expect(text).toContain("Paragraph two.");
  });

  it("interview markdown groups by category", () => {
    const md = interviewMarkdown(
      {
        questions: [
          { category: "Behavioural", question: "Tell me about yourself.", whyAsked: "Opener", answer: "I am…", keyPoints: ["Be brief"], difficulty: "easy" },
        ],
      },
      { title: "Data Analyst", company: "Acme" },
    );
    expect(md).toContain("## Behavioural");
    expect(md).toContain("### 1. Tell me about yourself.");
  });
});

describe("keyword matching", () => {
  const jd = `We need a Data Analyst with SQL, Power BI and Tableau. Experience with Snowflake and Python is an asset. Strong stakeholder management required. CPA not required.`;

  it("extracts keywords from a job description", () => {
    const k = extractKeywords(jd);
    expect(k).toEqual(expect.arrayContaining(["sql", "power bi", "tableau", "snowflake", "python", "stakeholder management"]));
  });

  it("ignores verbs that only start bullet points", () => {
    const posting = `Tasks:
• Develop policies and procedures
• Document technical requirements
• Assess risks to data
Work conditions: Fast-paced environment
Computer and technology knowledge: Java, Python, SQL Server`;
    const k = extractKeywords(posting);
    expect(k).not.toContain("develop");
    expect(k).not.toContain("document");
    expect(k).not.toContain("assess");
    expect(k).toEqual(expect.arrayContaining(["java", "python"]));
  });

  it("scores a resume against it", () => {
    const m = matchResume(profileToText(profile), jd);
    expect(m.matched).toEqual(expect.arrayContaining(["sql", "power bi", "python"]));
    expect(m.missing).toEqual(expect.arrayContaining(["tableau", "snowflake"]));
    expect(m.score).toBeGreaterThan(30);
    expect(m.score).toBeLessThan(100);
  });
});
