import { describe, expect, it } from "vitest";
import { assertValidAdminAccessToken, issueAdminAccessToken } from "./adminAuth";

describe("admin password access", () => {
  it("issues a valid time-limited token for the configured passcode", () => {
    const now = Date.now();
    const token = issueAdminAccessToken("1122", now);

    expect(() => assertValidAdminAccessToken(token, now + 60_000)).not.toThrow();
  });

  it("rejects an incorrect passcode", () => {
    expect(() => issueAdminAccessToken("incorrect")).toThrow("admin password is incorrect");
  });
});
