import { handle, HttpError } from "@/lib/api";
import { sendPush } from "@/lib/push";

export const POST = handle(async () => {
  const r = await sendPush({
    title: "Job Finder",
    body: "Notifications are working. You’ll get new jobs here once a day.",
    url: "/discover",
    tag: "test",
  });
  if (r.sent === 0) throw new HttpError(400, "No devices are set up for notifications yet.");
  return Response.json(r);
});
