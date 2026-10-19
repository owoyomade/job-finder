import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  clearFailedLogins,
  createSessionToken,
  loginAllowed,
  passwordMatches,
  recordFailedLogin,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!loginAllowed(ip)) {
    return Response.json({ error: "Too many attempts. Wait 10 minutes and try again." }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !passwordMatches(password)) {
    recordFailedLogin(ip);
    return Response.json({ error: "That password isn’t right." }, { status: 401 });
  }
  clearFailedLogins(ip);
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${await createSessionToken()}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${SESSION_DAYS * 86400}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return res;
}
