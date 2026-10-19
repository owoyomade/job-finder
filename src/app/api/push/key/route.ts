import { connection } from "next/server";
import { vapidKeys } from "@/lib/push";
import { listPushSubscriptions } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({ publicKey: vapidKeys().publicKey, devices: listPushSubscriptions().length });
}
