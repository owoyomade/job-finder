import { connection, type NextRequest } from "next/server";
import { listDocuments } from "@/lib/db";
import type { DocumentKind } from "@/lib/types";

export async function GET(req: NextRequest) {
  await connection();
  const jobId = req.nextUrl.searchParams.get("jobId") ?? undefined;
  const kind = (req.nextUrl.searchParams.get("kind") ?? undefined) as DocumentKind | undefined;
  return Response.json({ documents: listDocuments({ jobId, kind }) });
}
