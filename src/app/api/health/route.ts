import { connection } from "next/server";

/** Used by Railway to check the app is up. */
export async function GET() {
  await connection();
  return Response.json({ ok: true });
}
