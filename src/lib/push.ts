/**
 * Web push for daily job alerts. VAPID keys come from the environment if set,
 * otherwise they're generated once and kept in the database, so alerts work
 * without any extra setup.
 */
import webpush from "web-push";
import * as db from "./db";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function vapidKeys(): VapidKeys {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const stored = db.getSetting<VapidKeys>("vapid");
  if (stored) return stored;
  const keys = webpush.generateVAPIDKeys();
  db.setSetting("vapid", keys);
  return keys;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Send to every subscribed device; drops devices whose subscription has expired. */
export async function sendPush(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  const keys = vapidKeys();
  const subject = process.env.VAPID_SUBJECT || "mailto:jobfinder@example.com";
  let sent = 0;
  let removed = 0;
  for (const sub of db.listPushSubscriptions()) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), {
        vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
        TTL: 60 * 60 * 12,
      });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        db.deletePushSubscription(sub.endpoint);
        removed++;
      } else {
        console.error("push failed", status, (err as Error).message);
      }
    }
  }
  return { sent, removed };
}
