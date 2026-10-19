import { connection } from "next/server";
import { listApplications } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({ applications: listApplications() });
}
