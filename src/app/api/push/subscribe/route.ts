import { handle, HttpError } from "@/lib/api";
import { deletePushSubscription, savePushSubscription } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const { subscription } = (await req.json()) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys?.auth) {
    throw new HttpError(400, "That notification subscription isn’t valid.");
  }
  savePushSubscription({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  return Response.json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) deletePushSubscription(endpoint);
  return Response.json({ ok: true });
});
