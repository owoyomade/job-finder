import { handle } from "@/lib/api";
import { normalizeSearchParams, runSearch } from "@/lib/service";

export const POST = handle(async (req: Request) => {
  return Response.json(await runSearch(normalizeSearchParams(await req.json())));
});
