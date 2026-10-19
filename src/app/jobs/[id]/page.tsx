import { Suspense } from "react";
import { JobWorkspace } from "./JobWorkspace";

export default function JobPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading job…</p>}>
      <JobWorkspace />
    </Suspense>
  );
}
