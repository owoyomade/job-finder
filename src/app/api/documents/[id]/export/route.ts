import type { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { getDocument, getJob, getProfile } from "@/lib/db";
import { coverLetterBlocks, interviewBlocks, interviewMarkdown, resumeBlocks, type Block } from "@/lib/export/blocks";
import { blocksToDocx } from "@/lib/export/docx";
import { blocksToPdf } from "@/lib/export/pdf";
import type { CoverLetter, InterviewSet, TailoredResume } from "@/lib/types";

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").slice(0, 60);

export const GET = handle(async (req: NextRequest, ctx: RouteContext<"/api/documents/[id]/export">) => {
  const doc = getDocument(Number((await ctx.params).id));
  if (!doc) throw new HttpError(404, "Document not found.");
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  const job = doc.jobId ? getJob(doc.jobId) : null;
  const jobInfo = { title: job?.title ?? "Role", company: job?.company ?? "", location: job?.location ?? "" };
  const profile = getProfile()?.profile;

  let blocks: Block[];
  let baseName: string;
  if (doc.kind === "resume") {
    const r = (doc.data as TailoredResume).resume;
    blocks = resumeBlocks(r);
    baseName = `${slug(r.name)}_Resume_${slug(jobInfo.company || jobInfo.title)}`;
  } else if (doc.kind === "cover") {
    if (!profile) throw new HttpError(400, "Add your profile first.");
    blocks = coverLetterBlocks(profile, doc.data as CoverLetter, jobInfo);
    baseName = `${slug(profile.name)}_Cover_Letter_${slug(jobInfo.company || jobInfo.title)}`;
  } else {
    const set = doc.data as InterviewSet;
    baseName = `Interview_Prep_${slug(jobInfo.title)}`;
    if (format === "md") {
      return new Response(interviewMarkdown(set, jobInfo), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.md"`,
        },
      });
    }
    blocks = interviewBlocks(set, jobInfo);
  }

  if (format === "docx") {
    const buf = await blocksToDocx(blocks, baseName);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}.docx"`,
      },
    });
  }
  const buf = await blocksToPdf(blocks, baseName);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("inline") ? "inline" : "attachment"}; filename="${baseName}.pdf"`,
    },
  });
});
