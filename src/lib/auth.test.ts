import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  loginAllowed,
  passwordMatches,
  recordFailedLogin,
  verifySessionToken,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = "correct horse";
    process.env.SESSION_SECRET = "test-secret";
  });
  afterEach(() => {
    delete process.env.APP_PASSWORD;
    delete process.env.SESSION_SECRET;
  });

  it("checks the password", () => {
    expect(passwordMatches("correct horse")).toBe(true);
    expect(passwordMatches("correct hors")).toBe(false);
    expect(passwordMatches("")).toBe(false);
  });

  it("accepts its own session tokens and rejects tampered or expired ones", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    expect(await verifySessionToken(token, now)).toBe(true);
    const [exp, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(exp) + 1}.${sig}`, now)).toBe(false);
    expect(await verifySessionToken(token, Number(exp) + 1)).toBe(false);
    expect(await verifySessionToken(undefined, now)).toBe(false);
    process.env.SESSION_SECRET = "rotated";
    expect(await verifySessionToken(token, now)).toBe(false);
  });

  it("rate-limits repeated failures", () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 8; i++) recordFailedLogin(ip);
    expect(loginAllowed(ip)).toBe(false);
    expect(loginAllowed("198.51.100.1")).toBe(true);
  });
});
