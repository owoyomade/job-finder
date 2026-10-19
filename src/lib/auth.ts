/**
 * Single-user password protection. When APP_PASSWORD is set, every page and API
 * route needs a signed session cookie; when it isn't (local development), the
 * app stays open.
 *
 * Uses Web Crypto so it works in the proxy and in route handlers alike.
 */

export const SESSION_COOKIE = "jf_session";
export const SESSION_DAYS = 90;

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function secret(): string {
  return process.env.SESSION_SECRET || `jf:${process.env.APP_PASSWORD ?? ""}`;
}

const enc = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  return Buffer.from(sig).toString("base64url");
}

/** Compare two strings without leaking where they differ through timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const expires = String(now + SESSION_DAYS * 86_400_000);
  return `${expires}.${await hmac(expires)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(sig, await hmac(expires));
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  return expected.length > 0 && safeEqual(input, expected);
}

// ---------- Login rate limiting (per IP, in memory) ----------

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginAllowed(ip: string, now = Date.now()): boolean {
  const a = attempts.get(ip);
  if (!a || now - a.first > WINDOW_MS) return true;
  return a.count < MAX_ATTEMPTS;
}

export function recordFailedLogin(ip: string, now = Date.now()) {
  const a = attempts.get(ip);
  if (!a || now - a.first > WINDOW_MS) attempts.set(ip, { count: 1, first: now });
  else a.count++;
}

export function clearFailedLogins(ip: string) {
  attempts.delete(ip);
}
