import { redirect } from "next/navigation";

// Saved jobs now live in Applications.
export default function SavedPage() {
  redirect("/applications");
}
