import { handle, HttpError } from "@/lib/api";
import { createManualJob, setApplicationStatus } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const title = String(b.title ?? "").trim();
  const description = String(b.description ?? "").trim();
  if (!title || description.length < 50) throw new HttpError(400, "Add a job title and paste the full job description.");
  const job = createManualJob({
    title,
    company: String(b.company ?? "").trim(),
    location: String(b.location ?? "").trim(),
    description,
    applyUrl: String(b.applyUrl ?? "").trim(),
  });
  setApplicationStatus(job.id, "interested");
  return Response.json({ job });
});
