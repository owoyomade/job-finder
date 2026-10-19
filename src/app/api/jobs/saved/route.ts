import { connection } from "next/server";
import { listSavedJobs } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({ jobs: listSavedJobs().map((j) => ({ ...j, saved: true })) });
}
