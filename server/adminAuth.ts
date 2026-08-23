import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";

const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000;

function getAdminPassword() {
  const password = process.env.ADMIN_ACCESS_PASSWORD;
  if (!password) throw new Error("Admin access password is not configured");
  return password;
}

function sameValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueAdminAccessToken(password: string, now = Date.now()) {
  if (!sameValue(password, getAdminPassword())) {
    throw new TRPCError({ code: "FORBIDDEN", message: "The admin password is incorrect." });
  }

  const issuedAt = Math.floor(now / 1000).toString();
  const signature = createHmac("sha256", getAdminPassword()).update(issuedAt).digest("hex");
  return `${issuedAt}.${signature}`;
}

export function assertValidAdminAccessToken(token: string, now = Date.now()) {
  const [issuedAt, signature] = token.split(".");
  const issuedAtMs = Number(issuedAt) * 1000;
  if (!issuedAt || !signature || !Number.isFinite(issuedAtMs) || now - issuedAtMs > MAX_SESSION_AGE_MS || issuedAtMs > now + 60_000) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your admin session has expired. Enter the password again." });
  }

  const expected = createHmac("sha256", getAdminPassword()).update(issuedAt).digest("hex");
  if (!sameValue(signature, expected)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your admin session is invalid." });
  }
}
