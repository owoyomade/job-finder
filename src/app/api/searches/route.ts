import { connection } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { addSavedSearch, deleteSavedSearch, listSavedSearches } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({ searches: listSavedSearches() });
}

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  if (!b.params?.query) throw new HttpError(400, "Nothing to save.");
  addSavedSearch(String(b.name || b.params.query), b.params);
  return Response.json({ searches: listSavedSearches() });
});

export const DELETE = handle(async (req: Request) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  deleteSavedSearch(id);
  return Response.json({ searches: listSavedSearches() });
});
