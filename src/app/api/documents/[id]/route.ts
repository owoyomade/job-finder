import type { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { deleteDocument, getDocument, updateDocument } from "@/lib/db";
import { CoverLetterSchema, InterviewSetSchema, TailoredResumeSchema } from "@/lib/types";

const SCHEMAS = { resume: TailoredResumeSchema, cover: CoverLetterSchema, interview: InterviewSetSchema };

function load(id: string) {
  const doc = getDocument(Number(id));
  if (!doc) throw new HttpError(404, "Document not found.");
  return doc;
}

export const GET = handle(async (_req: NextRequest, ctx: RouteContext<"/api/documents/[id]">) => {
  return Response.json({ document: load((await ctx.params).id) });
});

export const PUT = handle(async (req: NextRequest, ctx: RouteContext<"/api/documents/[id]">) => {
  const doc = load((await ctx.params).id);
  const parsed = SCHEMAS[doc.kind].safeParse((await req.json()).data);
  if (!parsed.success) throw new HttpError(400, "Edited document is invalid.");
  updateDocument(doc.id, parsed.data);
  return Response.json({ document: { ...doc, data: parsed.data } });
});

export const DELETE = handle(async (_req: NextRequest, ctx: RouteContext<"/api/documents/[id]">) => {
  deleteDocument(load((await ctx.params).id).id);
  return Response.json({ ok: true });
});
